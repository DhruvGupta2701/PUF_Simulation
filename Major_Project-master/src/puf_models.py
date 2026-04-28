"""
puf_models.py

Modular, config-driven simulation framework for Physical Unclonable Functions (PUFs).

Implements:
    - ArbiterPUF  : Single arbiter with optional Gaussian noise
    - XORPUF      : k-way XOR composition of ArbiterPUF instances
    - generate_crps : Reusable CRP dataset generator (random / biased challenges)

Author : Divish Gupta
Project: Machine Learning Attacks on XOR Arbiter PUFs
"""

from __future__ import annotations

import numpy as np
from typing import Optional, Tuple, Literal


# ============================================================
# BASE PUF INTERFACE
# ============================================================

class BasePUF:
    """
    Abstract base class for all PUF implementations.

    Subclasses must implement:
        - get_response(challenge) -> int
    """

    def get_response(self, challenge: np.ndarray) -> int:
        raise NotImplementedError("Subclasses must implement get_response()")

    def generate_challenge(self) -> np.ndarray:
        raise NotImplementedError("Subclasses must implement generate_challenge()")


# ============================================================
# FEATURE VECTOR TRANSFORMATION  (internal utility)
# ============================================================

def _challenge_to_phi(challenge: np.ndarray) -> np.ndarray:
    """
    Convert a single binary challenge vector into its Phi (feature) representation.

    This is the standard linear additive delay model transformation used in
    Arbiter PUF analysis. For a challenge c of length n, the k-th feature is:

        phi[k] = prod_{i=k}^{n-1}  (1 - 2*c[i])

    Args:
        challenge: 1-D binary array of shape (n_stages,)

    Returns:
        phi: 1-D float array of shape (n_stages,)
    """
    n = len(challenge)
    phi = np.ones(n, dtype=float)
    for k in range(n):
        product = 1.0
        for i in range(k, n):
            product *= 1 - 2 * int(challenge[i])
        phi[k] = product
    return phi


def _challenges_to_phi_batch(challenges: np.ndarray) -> np.ndarray:
    """
    Vectorised batch version of _challenge_to_phi.

    Args:
        challenges: Binary matrix of shape (num_samples, n_stages)

    Returns:
        phi: Float matrix of shape (num_samples, n_stages)
    """
    mapped = 1 - 2 * challenges.astype(float)           # {0,1} → {1,−1}
    # phi[i,k] = cumulative product from column k to end (right-to-left)
    phi = np.cumprod(mapped[:, ::-1], axis=1)[:, ::-1]  # shape: (N, n_stages)
    return phi


# ============================================================
# ARBITER PUF
# ============================================================

class ArbiterPUF(BasePUF):
    """
    Single-chain Arbiter PUF using the linear additive delay model.

    The response is determined by the sign of the inner product between the
    Phi-transformed challenge and a device-specific weight vector:

        response = 1  if  Phi(c) · w > 0  else  0

    Optional Gaussian noise perturbs the delay sum at query time to model
    real-world instability.

    Args:
        n_stages : Number of PUF stages (challenge / weight dimensionality).
        noise    : Standard deviation of additive Gaussian noise on the delay
                   sum. Set to 0.0 (default) for a noise-free ideal PUF.
        seed     : Optional integer seed for the internal RNG. Passing the
                   same seed always produces the same weight vector, enabling
                   reproducible experiments.

    Example::

        puf = ArbiterPUF(n_stages=64, noise=0.05, seed=0)
        c   = puf.generate_challenge()
        r   = puf.get_response(c)
    """

    def __init__(
        self,
        n_stages: int,
        noise: float = 0.0,
        seed: Optional[int] = None,
    ) -> None:
        if n_stages < 1:
            raise ValueError("n_stages must be a positive integer.")
        if noise < 0:
            raise ValueError("noise (sigma) must be non-negative.")

        self.n_stages = n_stages
        self.noise = noise
        self.seed = seed

        self._rng = np.random.default_rng(seed)
        self._weights: np.ndarray = self._rng.standard_normal(n_stages)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_challenge(self) -> np.ndarray:
        """
        Sample one uniformly-random binary challenge.

        Returns:
            challenge: 1-D binary array of shape (n_stages,)
        """
        return self._rng.integers(0, 2, size=self.n_stages)

    def get_response(self, challenge: np.ndarray) -> int:
        """
        Evaluate the PUF on a single challenge.

        Args:
            challenge: 1-D binary array of shape (n_stages,)

        Returns:
            response: Integer 0 or 1
        """
        challenge = np.asarray(challenge, dtype=int)
        if challenge.shape != (self.n_stages,):
            raise ValueError(
                f"Challenge length {len(challenge)} does not match "
                f"n_stages={self.n_stages}."
            )

        phi = _challenge_to_phi(challenge)
        delay = float(np.dot(phi, self._weights))

        if self.noise > 0.0:
            delay += float(self._rng.normal(0.0, self.noise))

        return int(delay > 0)

    # ------------------------------------------------------------------
    # Batch helper (used internally by XORPUF / generate_crps)
    # ------------------------------------------------------------------

    def _get_responses_batch(self, challenges: np.ndarray) -> np.ndarray:
        """
        Evaluate the PUF on a batch of challenges efficiently.

        Args:
            challenges: Binary matrix of shape (num_samples, n_stages)

        Returns:
            responses: Integer array of shape (num_samples,)
        """
        phi = _challenges_to_phi_batch(challenges)
        delays = phi @ self._weights  # (num_samples,)

        if self.noise > 0.0:
            noise_vec = self._rng.normal(0.0, self.noise, size=len(delays))
            delays = delays + noise_vec

        return (delays > 0).astype(int)

    # ------------------------------------------------------------------
    # Representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"ArbiterPUF(n_stages={self.n_stages}, "
            f"noise={self.noise}, seed={self.seed})"
        )


# ============================================================
# XOR ARBITER PUF
# ============================================================

class XORPUF(BasePUF):
    """
    XOR Arbiter PUF — k independent ArbiterPUF instances whose binary
    responses are XOR-combined into a single output bit.

    XOR composition greatly increases the nonlinearity of the
    challenge-response mapping, making simple linear attacks ineffective.

    Args:
        n_stages : Number of stages shared by every internal ArbiterPUF.
        k        : Number of ArbiterPUF instances (XOR level). Higher k
                   makes ML attacks harder but also increases instability.
        noise    : Gaussian noise sigma forwarded to every ArbiterPUF.
        seed     : Optional integer master seed. Child ArbiterPUF instances
                   receive deterministically-derived seeds so the whole
                   ensemble is fully reproducible.

    Example::

        config = {"n_stages": 128, "xor_level": 4, "noise": 0.05}
        puf = XORPUF(config["n_stages"], config["xor_level"], config["noise"])
        c   = puf.generate_challenge()
        r   = puf.get_response(c)
    """

    def __init__(
        self,
        n_stages: int,
        k: int,
        noise: float = 0.0,
        seed: Optional[int] = None,
    ) -> None:
        if n_stages < 1:
            raise ValueError("n_stages must be a positive integer.")
        if k < 1:
            raise ValueError("k (XOR level) must be at least 1.")
        if noise < 0:
            raise ValueError("noise (sigma) must be non-negative.")

        self.n_stages = n_stages
        self.k = k
        self.noise = noise
        self.seed = seed

        # Each child gets a deterministically-derived seed so the whole
        # ensemble is reproducible when a master seed is given.
        child_seeds = (
            [seed + i for i in range(k)] if seed is not None else [None] * k
        )
        self._arbiters: list[ArbiterPUF] = [
            ArbiterPUF(n_stages, noise, child_seed)
            for child_seed in child_seeds
        ]

        self._rng = np.random.default_rng(seed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_challenge(self) -> np.ndarray:
        """
        Sample one uniformly-random binary challenge.

        Returns:
            challenge: 1-D binary array of shape (n_stages,)
        """
        return self._rng.integers(0, 2, size=self.n_stages)

    def get_response(self, challenge: np.ndarray) -> int:
        """
        XOR the responses of all internal ArbiterPUFs on the given challenge.

        Args:
            challenge: 1-D binary array of shape (n_stages,)

        Returns:
            response: Integer 0 or 1
        """
        response = 0
        for arbiter in self._arbiters:
            response ^= arbiter.get_response(challenge)
        return response

    # ------------------------------------------------------------------
    # Batch helper (used by generate_crps)
    # ------------------------------------------------------------------

    def _get_responses_batch(self, challenges: np.ndarray) -> np.ndarray:
        """
        Evaluate all internal arbiters on a batch and XOR results.

        Args:
            challenges: Binary matrix of shape (num_samples, n_stages)

        Returns:
            responses: Integer array of shape (num_samples,)
        """
        xor_result = np.zeros(len(challenges), dtype=int)
        for arbiter in self._arbiters:
            xor_result ^= arbiter._get_responses_batch(challenges)
        return xor_result

    # ------------------------------------------------------------------
    # Representation
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"XORPUF(n_stages={self.n_stages}, k={self.k}, "
            f"noise={self.noise}, seed={self.seed})"
        )


# ============================================================
# CRP GENERATOR
# ============================================================

ChallengeType = Literal["random", "biased"]


def generate_crps(
    puf: BasePUF,
    num_samples: int,
    challenge_type: ChallengeType = "random",
    bias: float = 0.7,
    seed: Optional[int] = None,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate a Challenge-Response Pair (CRP) dataset for any PUF instance.

    This is the primary data-generation entry point. It is decoupled from
    the PUF's own internal RNG, so you can request different dataset sizes
    or types without affecting the PUF's weight-vector state.

    Args:
        puf          : Any BasePUF subclass (ArbiterPUF, XORPUF, …).
        num_samples  : Number of CRPs to generate.
        challenge_type:
            "random" — Uniformly-random binary challenges (default).
            "biased" — Each bit is 1 with probability ``bias``.
        bias         : Probability of a '1' bit. Only used when
                       challenge_type="biased". Must be in (0, 1).
        seed         : Optional integer seed for the challenge sampler.
                       Does NOT affect the PUF's internal weights.

    Returns:
        X : Binary challenge matrix  of shape (num_samples, n_stages).
        y : Integer response vector  of shape (num_samples,).

    Raises:
        ValueError : On unsupported challenge_type or invalid bias.

    Example::

        puf = XORPUF(n_stages=64, k=2, noise=0.0, seed=42)
        X, y = generate_crps(puf, num_samples=10_000, seed=0)

        # Biased challenges
        X_b, y_b = generate_crps(puf, 5_000, challenge_type="biased", bias=0.6)
    """
    if num_samples < 1:
        raise ValueError("num_samples must be a positive integer.")
    if challenge_type not in ("random", "biased"):
        raise ValueError(
            f"Unsupported challenge_type '{challenge_type}'. "
            "Choose 'random' or 'biased'."
        )
    if challenge_type == "biased" and not (0.0 < bias < 1.0):
        raise ValueError("bias must be strictly between 0 and 1.")

    rng = np.random.default_rng(seed)

    n_stages = puf.n_stages

    # ── Challenge sampling ──────────────────────────────────────────────
    if challenge_type == "random":
        challenges = rng.integers(0, 2, size=(num_samples, n_stages))

    elif challenge_type == "biased":
        # Each bit is independently Bernoulli(bias)
        challenges = (rng.random(size=(num_samples, n_stages)) < bias).astype(int)

    # ── Response generation (batch path for speed) ──────────────────────
    if hasattr(puf, "_get_responses_batch"):
        responses = puf._get_responses_batch(challenges)
    else:
        # Fallback for custom BasePUF subclasses without batch method
        responses = np.array(
            [puf.get_response(challenges[i]) for i in range(num_samples)],
            dtype=int,
        )

    return challenges, responses


# ============================================================
# CONFIG-DRIVEN USAGE EXAMPLE  (run as script: python puf_models.py)
# ============================================================

if __name__ == "__main__":
    # ── Experiment configuration ────────────────────────────────────────
    config = {
        "n_stages"   : 64,
        "xor_level"  : 2,
        "noise"      : 0.05,
        "num_samples": 10_000,
        "seed"       : 42,
    }

    print("=" * 55)
    print("  PUF Simulation Framework — Config-Driven Example")
    print("=" * 55)
    print(f"Config: {config}\n")

    # ── Arbiter PUF (single) ────────────────────────────────────────────
    arbiter = ArbiterPUF(
        n_stages=config["n_stages"],
        noise=config["noise"],
        seed=config["seed"],
    )
    X_arb, y_arb = generate_crps(arbiter, config["num_samples"], seed=0)
    ones = y_arb.sum()
    print(f"[ArbiterPUF]  {arbiter}")
    print(f"  Dataset : {X_arb.shape}  responses → 1s={ones}, 0s={len(y_arb)-ones}\n")

    # ── XOR PUF ─────────────────────────────────────────────────────────
    xor_puf = XORPUF(
        n_stages=config["n_stages"],
        k=config["xor_level"],
        noise=config["noise"],
        seed=config["seed"],
    )
    X_xor, y_xor = generate_crps(xor_puf, config["num_samples"], seed=0)
    ones = y_xor.sum()
    print(f"[XORPUF]      {xor_puf}")
    print(f"  Dataset : {X_xor.shape}  responses → 1s={ones}, 0s={len(y_xor)-ones}\n")

    # ── Biased challenges ────────────────────────────────────────────────
    X_bias, y_bias = generate_crps(
        xor_puf, 5_000, challenge_type="biased", bias=0.7, seed=1
    )
    print(f"[Biased CRPs] shape={X_bias.shape}  "
          f"mean_challenge_bit={X_bias.mean():.3f}  (expected≈0.70)")
    print("=" * 55)
