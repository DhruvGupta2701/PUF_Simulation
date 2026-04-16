"""
main.py – Entry-point for PUF ML attack experiments.
"""

from sklearn.model_selection import train_test_split

from puf_models import XORPUF, generate_crps
from attack_models import logistic_attack, mlp_attack


def run_experiment(config: dict) -> float:
    n_stages    = int(config.get("n_stages",    64))
    xor_level   = int(config.get("xor_level",   2))
    noise       = float(config.get("noise",     0.0))
    num_samples = int(config.get("num_samples", 10000))
    seed        = int(config.get("seed",        42))
    model_type  = str(config.get("model_type",  "lr"))

    puf = XORPUF(n_stages=n_stages, k=xor_level, noise=noise, seed=seed)
    X, y = generate_crps(puf, num_samples=num_samples, seed=seed)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=seed
    )

    if model_type == "mlp":
        accuracy, _ = mlp_attack(X_train, y_train, X_test, y_test, seed=seed)
    else:
        accuracy, _ = logistic_attack(X_train, y_train, X_test, y_test, seed=seed)

    return accuracy


if __name__ == "__main__":
    config = {"n_stages": 32, "xor_level": 2, "noise": 0.0, "num_samples": 10000, "seed": 42}
    print(f"Accuracy: {run_experiment(config):.4f}")
