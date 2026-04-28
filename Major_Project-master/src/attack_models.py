"""
attack_models.py

Modular machine-learning attack models for Physical Unclonable Functions (PUFs).

Each attack function:
    - Accepts any (X_train, y_train, X_test, y_test) dataset.
    - Is independent of PUF configuration (n_stages, k, noise, …).
    - Returns (accuracy, training_time) for easy comparison.

Supported attacks:
    - logistic_attack  : Linear modeling attack via Logistic Regression.
    - mlp_attack       : Non-linear modeling attack via MLP Classifier.
    - run_attack_suite : Convenience runner — trains both models and
                         prints a formatted comparison report.

Author : Divish Gupta
Project: Machine Learning Attacks on XOR Arbiter PUFs
"""

from __future__ import annotations

import time
from typing import Optional, Tuple

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler


# ============================================================
# TYPE ALIASES
# ============================================================

Dataset = Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]
AttackResult = Tuple[float, float]    # (accuracy, training_time_seconds)


# ============================================================
# LOGISTIC REGRESSION ATTACK  (linear modeling)
# ============================================================

def logistic_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    *,
    max_iter: int = 1000,
    solver: str = "lbfgs",
    C: float = 1.0,
    seed: Optional[int] = 42,
    scale_features: bool = True,
) -> AttackResult:
    """
    Linear modeling attack using Logistic Regression.

    Works on any PUF configuration — input shape is inferred automatically.

    Args:
        X_train        : Challenge (feature) matrix for training.
        y_train        : Response labels for training.
        X_test         : Challenge (feature) matrix for evaluation.
        y_test         : Response labels for evaluation.
        max_iter       : Maximum solver iterations (default 1000).
        solver         : Optimisation solver passed to LogisticRegression.
        C              : Inverse regularisation strength (larger = less
                         regularisation).
        seed           : Random state for reproducibility.
        scale_features : If True (default), apply StandardScaler before
                         fitting — improves convergence on Phi features.

    Returns:
        accuracy      : Fraction of correctly predicted test responses.
        training_time : Wall-clock training time in seconds.

    Example::

        from puf_models import XORPUF, generate_crps
        from sklearn.model_selection import train_test_split

        puf  = XORPUF(n_stages=64, k=2, noise=0.0, seed=0)
        X, y = generate_crps(puf, 10_000)
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2)
        acc, t = logistic_attack(X_tr, y_tr, X_te, y_te)
        print(f"Accuracy: {acc:.4f}  Time: {t:.2f}s")
    """
    scaler = StandardScaler() if scale_features else None

    if scaler is not None:
        X_train = scaler.fit_transform(X_train)
        X_test  = scaler.transform(X_test)

    model = LogisticRegression(
        max_iter=max_iter,
        solver=solver,
        C=C,
        random_state=seed,
    )

    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    training_time = time.perf_counter() - t0

    y_pred   = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))

    return accuracy, training_time


# ============================================================
# MLP ATTACK  (non-linear modeling)
# ============================================================

def mlp_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    *,
    hidden_layers: Tuple[int, ...] = (64, 64),
    max_iter: int = 400,
    learning_rate_init: float = 1e-3,
    solver: str = "adam",
    seed: Optional[int] = 42,
    scale_features: bool = True,
) -> AttackResult:
    """
    Non-linear modeling attack using a Multi-Layer Perceptron (MLP).

    Effective against XOR PUFs where Logistic Regression fails.
    Works on any PUF configuration — input shape is inferred automatically.

    Args:
        X_train            : Challenge (feature) matrix for training.
        y_train            : Response labels for training.
        X_test             : Challenge (feature) matrix for evaluation.
        y_test             : Response labels for evaluation.
        hidden_layers      : Tuple defining the hidden layer sizes,
                             e.g. (64, 64) means two hidden layers of 64
                             neurons each. Increase for higher XOR levels.
        max_iter           : Maximum training epochs (default 400).
        learning_rate_init : Initial learning rate for Adam (default 1e-3).
        solver             : Optimisation solver ('adam' recommended).
        seed               : Random state for reproducibility.
        scale_features     : If True (default), apply StandardScaler.

    Returns:
        accuracy      : Fraction of correctly predicted test responses.
        training_time : Wall-clock training time in seconds.

    Example::

        acc, t = mlp_attack(
            X_tr, y_tr, X_te, y_te,
            hidden_layers=(128, 64),
            max_iter=500,
        )
        print(f"MLP Accuracy: {acc:.4f}  Time: {t:.2f}s")
    """
    scaler = StandardScaler() if scale_features else None

    if scaler is not None:
        X_train = scaler.fit_transform(X_train)
        X_test  = scaler.transform(X_test)

    model = MLPClassifier(
        hidden_layer_sizes=hidden_layers,
        max_iter=max_iter,
        learning_rate_init=learning_rate_init,
        solver=solver,
        random_state=seed,
    )

    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    training_time = time.perf_counter() - t0

    y_pred   = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))

    return accuracy, training_time


# ============================================================
# CONVENIENCE RUNNER  (trains both models, prints report)
# ============================================================

def run_attack_suite(
    X: np.ndarray,
    y: np.ndarray,
    *,
    test_size: float = 0.2,
    seed: Optional[int] = 42,
    mlp_hidden_layers: Tuple[int, ...] = (64, 64),
    mlp_max_iter: int = 400,
    label: str = "PUF",
) -> dict:
    """
    Train and evaluate both attacks on a single CRP dataset.

    Splits the dataset, runs Logistic Regression and MLP, then prints
    a formatted comparison table.

    Args:
        X                : Full challenge matrix (num_samples, n_stages).
        y                : Full response vector  (num_samples,).
        test_size        : Fraction of data held out for evaluation.
        seed             : Random state for the train/test split and models.
        mlp_hidden_layers: Hidden layer sizes forwarded to mlp_attack().
        mlp_max_iter     : Max epochs forwarded to mlp_attack().
        label            : Descriptive label printed in the report header.

    Returns:
        results dict with keys:
            "lr_accuracy", "lr_time", "mlp_accuracy", "mlp_time"

    Example::

        from puf_models import XORPUF, generate_crps
        puf  = XORPUF(n_stages=64, k=2, noise=0.0, seed=0)
        X, y = generate_crps(puf, 10_000)
        run_attack_suite(X, y, label="2-XOR 64-stage")
    """
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=test_size, random_state=seed
    )

    lr_acc,  lr_t  = logistic_attack(X_tr, y_tr, X_te, y_te, seed=seed)
    mlp_acc, mlp_t = mlp_attack(
        X_tr, y_tr, X_te, y_te,
        hidden_layers=mlp_hidden_layers,
        max_iter=mlp_max_iter,
        seed=seed,
    )

    # ── Pretty report ────────────────────────────────────────────────────
    sep = "-" * 50
    print(sep)
    print(f"  Attack Results — {label}")
    print(sep)
    print(f"  {'Model':<26} {'Accuracy':>9}  {'Time (s)':>9}")
    print(sep)
    print(f"  {'Logistic Regression':<26} {lr_acc:>9.4f}  {lr_t:>9.3f}")
    print(f"  {'MLP Classifier':<26} {mlp_acc:>9.4f}  {mlp_t:>9.3f}")
    print(sep)

    return {
        "lr_accuracy" : lr_acc,
        "lr_time"     : lr_t,
        "mlp_accuracy": mlp_acc,
        "mlp_time"    : mlp_t,
    }


# ============================================================
# STANDALONE DEMO  (run as script: python attack_models.py)
# ============================================================

if __name__ == "__main__":
    # Lazy import so the module stays usable without puf_models on the path
    try:
        from puf_models import XORPUF, generate_crps
    except ImportError:
        raise SystemExit(
            "puf_models.py not found. Place it in the same directory "
            "and run: python attack_models.py"
        )

    print("=" * 50)
    print("  ML Attack Suite — Standalone Demo")
    print("=" * 50)

    for k in (1, 2, 3):
        puf  = XORPUF(n_stages=64, k=k, noise=0.0, seed=0)
        X, y = generate_crps(puf, num_samples=10_000, seed=1)

        run_attack_suite(
            X, y,
            label=f"{k}-XOR Arbiter PUF (64 stages)",
            mlp_hidden_layers=(64, 64),
            mlp_max_iter=300,
        )
        print()
