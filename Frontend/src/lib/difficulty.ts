import { ExperimentConfig } from '../types';

export type DifficultyLevel = 'Trivial' | 'Easy' | 'Moderate' | 'Hard' | 'Extreme' | 'Research-Grade Resistant';

export interface DifficultyEvaluation {
  score: number; // 0 to 100
  level: DifficultyLevel;
  color: string;
  explanation: string;
  recommendations: string[];
}

export function evaluateDifficulty(config: ExperimentConfig, achievedAccuracy?: number): DifficultyEvaluation {
  let score = 0;
  const recommendations: string[] = [];
  const explanationParts: string[] = [];

  // 1. XOR Level (Primary driver of mathematical complexity)
  if (config.xor_level === 1) {
    score += 10;
    explanationParts.push("A single arbiter (1-XOR) is completely linear.");
    recommendations.push("Increase XOR depth (k > 1) to introduce non-linear modeling complexity.");
  } else if (config.xor_level === 2) {
    score += 35;
    explanationParts.push("2-XOR introduces mild non-linearity.");
    recommendations.push("Consider 3-XOR or 4-XOR to prevent basic ML algorithms from converging easily.");
  } else if (config.xor_level === 3) {
    score += 60;
    explanationParts.push("3-XOR provides strong non-linear resistance.");
  } else if (config.xor_level === 4) {
    score += 80;
    explanationParts.push("4-XOR presents severe challenges to most ML models.");
  } else {
    score += 85 + (config.xor_level - 4) * 5;
    explanationParts.push(`${config.xor_level}-XOR represents extreme mathematical complexity.`);
  }

  // 2. Noise Level (Obscures the ground truth)
  if (config.noise > 0) {
    score += (config.noise * 100);
    if (config.noise >= 0.1) {
      explanationParts.push(`High Gaussian noise (σ=${config.noise}) heavily masks the underlying arbiter delays.`);
    } else {
      explanationParts.push(`Minor noise (σ=${config.noise}) adds slight instability.`);
    }
  } else {
    recommendations.push("Inject device noise to obscure the underlying physical parameters from the attacker.");
  }

  // 3. CRP Count (Attacker's data advantage)
  if (config.num_samples < 5000) {
    score += 15;
    explanationParts.push("A restricted CRP dataset starves the model of training data.");
  } else if (config.num_samples > 50000) {
    score -= 15;
    explanationParts.push("A massive exposed CRP dataset gives the attacker a huge statistical advantage.");
    recommendations.push("Restrict the number of exposed Challenge-Response Pairs (CRPs) available to the attacker.");
  } else {
    explanationParts.push("A standard dataset size provides moderate training potential.");
  }

  // 4. Model Type
  if (config.model_type !== 'all') {
    if (config.model_type === 'lr') {
      if (config.xor_level > 1) {
        score += 30; // LR fails on XOR > 1
        explanationParts.push("Logistic Regression cannot natively resolve non-linear XOR dependencies.");
        recommendations.push("Use a non-linear model (like Neural Networks or SVMs) to attack XOR PUFs.");
      }
    } else if (config.model_type === 'mlp' || config.model_type === 'svm') {
      score -= 10;
      explanationParts.push(`The ${config.model_type.toUpperCase()} model is highly capable of modeling non-linear device behaviors.`);
    }
  }

  // Cap initial score before override
  score = Math.max(0, Math.min(100, score));

  // 5. Post-Attack Override (Empirical Ground Truth)
  if (achievedAccuracy !== undefined) {
    if (achievedAccuracy <= 0.55) {
      score = Math.max(score, 95);
      explanationParts.push("The empirical attack failed entirely (~50% accuracy), proving extreme resistance.");
    } else if (achievedAccuracy <= 0.65) {
      score = Math.max(score, 75);
      explanationParts.push("The empirical attack struggled to find meaningful correlations.");
    } else if (achievedAccuracy >= 0.90) {
      score = Math.min(score, 30);
      explanationParts.push(`However, the attack achieved highly accurate cloning (${(achievedAccuracy * 100).toFixed(1)}%), proving the configuration is vulnerable.`);
    } else if (achievedAccuracy >= 0.75) {
      score = Math.min(score, 60);
      explanationParts.push("The attack achieved partial predictive capability.");
    }
  }

  // Final clamp
  score = Math.floor(Math.max(0, Math.min(100, score)));

  // 6. Classification & Colors
  let level: DifficultyLevel;
  let color: string;

  if (score < 25) {
    level = 'Trivial';
    color = '#0ea5e9'; // Cyan
  } else if (score < 45) {
    level = 'Easy';
    color = '#34d399'; // Emerald
  } else if (score < 65) {
    level = 'Moderate';
    color = '#facc15'; // Yellow
  } else if (score < 85) {
    level = 'Hard';
    color = '#fb923c'; // Orange
  } else if (score < 95) {
    level = 'Extreme';
    color = '#f87171'; // Red
  } else {
    level = 'Research-Grade Resistant';
    color = '#a855f7'; // Purple
  }

  return {
    score,
    level,
    color,
    explanation: explanationParts.join(" "),
    recommendations: recommendations.length > 0 ? recommendations : ["Configuration is currently optimal against standard attacks."]
  };
}
