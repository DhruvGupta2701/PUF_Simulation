import { ExperimentConfig } from '../types';

export interface SecurityAnalysis {
  assessment: string;
  modelBehavior: string;
  observations: string[];
  findings: {
    strongestVulnerability: string;
    strongestDefense: string;
    modelingResistance: string;
    feasibility: string;
  };
}

export function generateSecurityAnalysis(config: ExperimentConfig, accuracy: number): SecurityAnalysis {
  const accPct = accuracy * 100;
  let assessment = "";
  let modelBehavior = "";
  const observations: string[] = [];
  const findings = {
    strongestVulnerability: "None identified",
    strongestDefense: "None identified",
    modelingResistance: "Unknown",
    feasibility: "Unknown"
  };

  // --- ASSESSMENT GENERATION ---
  if (accPct >= 95) {
    assessment = `Critical vulnerability detected. The configuration achieved a highly predictive cloning rate of ${accPct.toFixed(1)}%, indicating that the underlying physical parameters have been successfully mathematically modeled. The device's challenge-response mechanism offers negligible cryptographic security against the current attack vector.`;
    findings.feasibility = "Trivially Exploitable";
    findings.modelingResistance = "Critically Low";
  } else if (accPct >= 80) {
    assessment = `The architecture exhibits significant vulnerabilities. With a prediction accuracy of ${accPct.toFixed(1)}%, the attack model has successfully isolated strong correlations within the Challenge-Response Pairs (CRPs). While not perfectly cloned, the entropy is sufficiently compromised to invalidate the PUF's security guarantees.`;
    findings.feasibility = "Highly Feasible";
    findings.modelingResistance = "Low";
  } else if (accPct >= 65) {
    assessment = `Moderate resistance observed. The cloning accuracy of ${accPct.toFixed(1)}% indicates the model struggled to fully map the non-linear boundaries of the architecture. However, the predictive edge over random guessing (50%) suggests partial leakage of physical characteristics.`;
    findings.feasibility = "Requires Optimization";
    findings.modelingResistance = "Moderate";
  } else {
    assessment = `Strong resistance verified. The attack failed to achieve meaningful convergence, yielding a near-random prediction accuracy of ${accPct.toFixed(1)}%. The combination of architectural depth and environmental noise effectively thwarted the machine learning attack, preserving the PUF's physical unpredictability.`;
    findings.feasibility = "Computationally Infeasible";
    findings.modelingResistance = "High / Research-Grade";
  }

  // --- MODEL BEHAVIOR ---
  if (config.model_type === 'lr') {
    if (config.xor_level > 1) {
      modelBehavior = `Logistic Regression (LR) assumes linear separability. The introduction of ${config.xor_level}-XOR gating creates a strictly non-linear boundary that LR cannot natively resolve. The algorithm mathematically plateaus unless the feature space is artificially expanded.`;
      if (accPct < 60) {
        modelBehavior += ` As expected, the linear classifier failed completely against this XOR depth.`;
      } else {
        modelBehavior += ` Surprisingly, the linear classifier achieved unexpected success, likely due to a lack of sufficient noise or a critically small challenge space.`;
      }
    } else {
      modelBehavior = `Logistic Regression serves as an optimal baseline attack against standard, 1-XOR Arbiter PUFs due to their inherent linearity. The algorithm rapidly isolates the delay vectors using gradient descent.`;
    }
  } else if (config.model_type === 'mlp') {
    modelBehavior = `The Multi-Layer Perceptron (MLP) utilized deep hidden layers to approximate the non-linear XOR functions. By mapping the challenge bits into a high-dimensional space, the neural network attempted to bypass the strict linear resistance of the arbiter chains.`;
  } else if (config.model_type === 'svm') {
    modelBehavior = `The Support Vector Machine (SVM) deployed non-linear kernel tricks (e.g., RBF) to project the CRP dataset into a higher-dimensional hyperplane, attempting to linearly separate the highly entangled XOR responses.`;
  } else if (config.model_type === 'rf') {
    modelBehavior = `The Random Forest ensemble attempted to model the PUF using localized decision boundaries. While robust against overfitting, tree-based models often struggle to capture the global parity functions intrinsic to deep XOR PUFs.`;
  } else {
    modelBehavior = `The multi-model ensemble evaluated diverse algorithmic approaches, contrasting linear baselines against deep neural and tree-based topologies to identify the optimal attack vector.`;
  }

  // --- OBSERVATIONS & FINDINGS ---
  
  // XOR Depth Analysis
  if (config.xor_level === 1) {
    observations.push(`Linear Dependency: The 1-XOR architecture lacks necessary cryptographic confusion.`);
    findings.strongestVulnerability = "Strict Linearity (1-XOR)";
  } else if (config.xor_level >= 4) {
    observations.push(`High Cryptographic Confusion: The ${config.xor_level}-XOR depth exponentially scales the attack search space.`);
    findings.strongestDefense = `High XOR Depth (${config.xor_level}-XOR)`;
  }

  // Noise Analysis
  if (config.noise >= 0.15) {
    observations.push(`Signal Obfuscation: Injected Gaussian noise (σ=${config.noise.toFixed(2)}) significantly impaired the model's ability to locate stable gradients.`);
    if (config.xor_level < 4) findings.strongestDefense = `High Noise Tolerance (σ=${config.noise.toFixed(2)})`;
  } else if (config.noise === 0) {
    observations.push(`Ideal Environment: The absence of noise provided the model with a perfect, noiseless ground truth, accelerating convergence.`);
    if (config.xor_level > 1) findings.strongestVulnerability = "Zero Environmental Noise";
  }

  // Dataset Size Analysis
  if (config.num_samples > 50000) {
    observations.push(`Data Saturation: The massive dataset (${config.num_samples.toLocaleString()} CRPs) provided the attacker with an overwhelming statistical advantage, risking deep learning memorization.`);
    findings.strongestVulnerability = "Excessive Exposed CRPs";
  } else if (config.num_samples < 5000) {
    observations.push(`Data Starvation: The restricted dataset size (${config.num_samples.toLocaleString()} CRPs) severely limited the model's ability to generalize, inducing artificial overfitting.`);
    if (!findings.strongestDefense.includes("XOR") && !findings.strongestDefense.includes("Noise")) {
      findings.strongestDefense = "Restricted CRP Availability";
    }
  }

  // Fallbacks
  if (findings.strongestVulnerability === "None identified") {
    findings.strongestVulnerability = "Standard configuration baseline";
  }
  if (findings.strongestDefense === "None identified") {
    findings.strongestDefense = "Standard delay variance";
  }

  return {
    assessment,
    modelBehavior,
    observations,
    findings
  };
}
