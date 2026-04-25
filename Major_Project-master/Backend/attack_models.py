"""
attack_models.py
================
Machine-learning attack functions for Arbiter / XOR PUF modelling.

Functions
---------
logistic_attack : Logistic regression attack returning accuracy and model.
mlp_attack      : Multi-layer perceptron attack returning accuracy and model.
svm_attack      : Support Vector Machine attack returning accuracy and model.
rf_attack       : Random Forest attack returning accuracy and model.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier


# ---------------------------------------------------------------------------
# Logistic Regression Attack
# ---------------------------------------------------------------------------

def logistic_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    seed: int = 42,
    max_iter: int = 2000,
) -> tuple[float, LogisticRegression]:
    """
    Train a logistic regression model to predict PUF responses.

    Parameters
    ----------
    X_train, y_train : training features and labels.
    X_test,  y_test  : test features and labels.
    seed             : random state for reproducibility.
    max_iter         : maximum number of solver iterations.

    Returns
    -------
    accuracy : float   – fraction of test responses predicted correctly.
    model    : fitted LogisticRegression instance.
    """
    model = LogisticRegression(
        max_iter=max_iter,
        random_state=seed,
        solver="lbfgs",
        C=10.0,
    )
    model.fit(X_train, y_train)
    accuracy = float(model.score(X_test, y_test))
    return accuracy, model


# ---------------------------------------------------------------------------
# MLP Attack
# ---------------------------------------------------------------------------

def mlp_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    seed: int = 42,
    hidden_layer_sizes: tuple = (128, 64),
    max_iter: int = 1000,
) -> tuple[float, MLPClassifier]:
    """
    Train a Multi-Layer Perceptron (MLP) to predict PUF responses.

    Parameters
    ----------
    X_train, y_train    : training features and labels.
    X_test,  y_test     : test features and labels.
    seed                : random state for reproducibility.
    hidden_layer_sizes  : architecture of hidden layers.
    max_iter            : maximum number of training epochs.

    Returns
    -------
    accuracy : float         – fraction of test responses predicted correctly.
    model    : fitted MLPClassifier instance.
    """
    model = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation="relu",
        solver="adam",
        max_iter=max_iter,
        random_state=seed,
        early_stopping=True,
        validation_fraction=0.1,
    )
    model.fit(X_train, y_train)
    accuracy = float(model.score(X_test, y_test))
    return accuracy, model

# ---------------------------------------------------------------------------
# SVM Attack
# ---------------------------------------------------------------------------

def svm_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    seed: int = 42,
) -> tuple[float, SVC]:
    """
    Train a Support Vector Machine (SVM) to predict PUF responses.
    """
    model = SVC(kernel="rbf", random_state=seed, max_iter=5000, C=10.0)
    model.fit(X_train, y_train)
    accuracy = float(model.score(X_test, y_test))
    return accuracy, model


# ---------------------------------------------------------------------------
# Random Forest Attack
# ---------------------------------------------------------------------------

def rf_attack(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    seed: int = 42,
    n_estimators: int = 200,
) -> tuple[float, RandomForestClassifier]:
    """
    Train a Random Forest to predict PUF responses.
    """
    model = RandomForestClassifier(n_estimators=n_estimators, random_state=seed)
    model.fit(X_train, y_train)
    accuracy = float(model.score(X_test, y_test))
    return accuracy, model
