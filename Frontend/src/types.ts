export type ViewType = 'OVERVIEW' | 'CONFIGURATION' | 'SIMULATION' | 'RESULTS';

export interface ExperimentConfig {
  n_stages: number;
  xor_level: number;
  noise: number;
  num_samples: number;
  seed: number;
  model_type: 'lr' | 'mlp';
}

export interface ExperimentResult {
  accuracy: number;
  model_type: string;
  n_stages: number;
  xor_level: number;
  noise: number;
  num_samples: number;
  seed: number;
  timestamp: string;
}

export interface SimulationRun {
  id: string;
  timestamp: string;
  config: ExperimentConfig;
  result: ExperimentResult;
  status: 'COMPLETE' | 'FAILED' | 'PENDING';
}
