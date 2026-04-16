"""
puf_models.py
=============
Core simulation classes for Arbiter PUF and XOR Arbiter PUF.

Classes
-------
ArbiterPUF  : Single-chain arbiter PUF with optional Gaussian noise.
XORPUF      : k-way XOR composition of ArbiterPUF instances.

Functions
---------
generate_crps : Generate a (challenges, responses) dataset for any PUF.
"""

import numpy as np


# ---------------------------------------------------------------------------
# ArbiterPUF
# ---------------------------------------------------------------------------

class ArbiterPUF:
    """
    Single-chain Arbiter PUF.

    Parameters
    ----------
    n_stages : int
        Number of delay stages (= challenge bit-length).
    noise : float
        Standard deviation of additive Gaussian noise injected at evaluation.
        Set to 0.0 for a noise-free device.
    seed : int or None
        RNG seed used to sample the delay-difference weight vector.
    """

    def __init__(self, n_stages: int = 64, noise: float = 0.0, seed: int = None):
        self.n_stages = n_stages
        self.noise    = noise
        self.seed     = seed

        rng = np.random.default_rng(seed)
        # Weight vector w ∈ R^(n+1)  (last element is the bias term)
        self.weights = rng.standard_normal(n_stages + 1)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_challenge(self, seed: int = None) -> np.ndarray:
        """Return one random binary challenge vector in {0, 1}^n."""
        rng = np.random.default_rng(seed)
        return rng.integers(0, 2, size=self.n_stages)

    def get_response(self, challenge: np.ndarray) -> int:
        """
        Evaluate the PUF on *challenge* and return a binary response in {0, 1}.

        Uses the standard linear additive delay model with the φ feature
        transformation.
        """
        phi   = self._phi(challenge)
        delay = np.dot(self.weights, phi)
        if self.noise > 0.0:
            delay += np.random.normal(0, self.noise)
        return int(delay > 0)

    # ------------------------------------------------------------------
    # Feature transformation (shared with attack models)
    # ------------------------------------------------------------------

    @staticmethod
    def transform_challenge(challenge: np.ndarray) -> np.ndarray:
        """
        Convert a raw binary challenge to the φ feature vector used by the
        linear additive delay model.

        Maps each bit b ∈ {0,1} → parity ∈ {+1, −1} and computes the
        cumulative-product suffix, then appends a bias term.

        Parameters
        ----------
        challenge : ndarray, shape (n,)

        Returns
        -------
        phi : ndarray, shape (n+1,)
        """
        n      = len(challenge)
        parity = 1 - 2 * challenge            # {0,1} → {+1, −1}
        phi    = np.ones(n + 1)

        # phi[i] = product of parity[i..n-1]
        for i in range(n - 1, -1, -1):
            phi[i] = parity[i] * phi[i + 1]

        return phi

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _phi(self, challenge: np.ndarray) -> np.ndarray:
        return self.transform_challenge(challenge)

    def __repr__(self) -> str:
        return (f"ArbiterPUF(n_stages={self.n_stages}, "
                f"noise={self.noise}, seed={self.seed})")


# ---------------------------------------------------------------------------
# XORPUF
# ---------------------------------------------------------------------------

class XORPUF:
    """
    k-way XOR Arbiter PUF.

    Composes *k* independent ArbiterPUF instances.  The final response is the
    XOR of all individual arbiter responses.

    Parameters
    ----------
    n_stages : int
        Number of delay stages shared across all arbiters.
    k : int
        Number of arbiter chains to XOR.
    noise : float
        Per-arbiter Gaussian noise standard deviation.
    seed : int or None
        Master seed; each arbiter receives a derived seed (seed + i).
    """

    def __init__(self, n_stages: int = 64, k: int = 2,
                 noise: float = 0.0, seed: int = None):
        self.n_stages = n_stages
        self.k        = k
        self.noise    = noise
        self.seed     = seed

        # Derive a unique, reproducible seed for every arbiter
        self.arbiters = [
            ArbiterPUF(
                n_stages=n_stages,
                noise=noise,
                seed=(seed + i) if seed is not None else None,
            )
            for i in range(k)
        ]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_challenge(self, seed: int = None) -> np.ndarray:
        """Return one random binary challenge vector in {0, 1}^n."""
        rng = np.random.default_rng(seed)
        return rng.integers(0, 2, size=self.n_stages)

    def get_response(self, challenge: np.ndarray) -> int:
        """
        Evaluate the XOR PUF on *challenge*.

        Returns XOR of all individual arbiter responses.
        """
        response = 0
        for arbiter in self.arbiters:
            response ^= arbiter.get_response(challenge)
        return response

    def __repr__(self) -> str:
        return (f"XORPUF(n_stages={self.n_stages}, k={self.k}, "
                f"noise={self.noise}, seed={self.seed})")


# ---------------------------------------------------------------------------
# CRP dataset generator
# ---------------------------------------------------------------------------

def generate_crps(puf, num_samples: int = 10000,
                  seed: int = None) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate a Challenge–Response Pair (CRP) dataset.

    Challenges are drawn uniformly at random from {0, 1}^n.  Each challenge
    is transformed into the φ feature vector before being stored so that the
    returned *X* matrix is ready for use with linear / logistic models.

    Parameters
    ----------
    puf : ArbiterPUF or XORPUF
        The PUF instance to query.
    num_samples : int
        Number of CRPs to generate.
    seed : int or None
        RNG seed for challenge generation (does **not** affect PUF weights).

    Returns
    -------
    X : ndarray, shape (num_samples, n_stages + 1)
        Feature-transformed challenges.
    y : ndarray, shape (num_samples,)
        Binary responses in {0, 1}.
    """
    rng        = np.random.default_rng(seed)
    n          = puf.n_stages
    challenges = rng.integers(0, 2, size=(num_samples, n))

    X = np.array([ArbiterPUF.transform_challenge(c) for c in challenges])
    y = np.array([puf.get_response(c) for c in challenges])

    return X, y
