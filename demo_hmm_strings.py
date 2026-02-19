import numpy as np

class HMM:
    def __init__(self, n_states, observations):
        self.state_map = {f"S{i}": i for i in range(n_states)}
        self.rev_state_map = {i: f"S{i}" for i in range(n_states)}
        
        # Map unique observations to indices
        unique_obs = sorted(list(set(observations)))
        self.obs_map = {obs: i for i, obs in enumerate(unique_obs)}
        self.rev_obs_map = {i: obs for i, obs in enumerate(unique_obs)}
        
        self.N = n_states
        self.M = len(unique_obs)
        self.obs_seq = [self.obs_map[o] for o in observations]
        
        # Random initialization
        np.random.seed(42)
        self.A = np.random.rand(self.N, self.N)
        self.A /= self.A.sum(axis=1, keepdims=True)
        
        self.B = np.random.rand(self.N, self.M)
        self.B /= self.B.sum(axis=1, keepdims=True)
        
        self.Pi = np.random.rand(self.N)
        self.Pi /= self.Pi.sum()

    def train(self, n_iter=20):
        T = len(self.obs_seq)
        for _ in range(n_iter):
            # Forward
            alpha = np.zeros((T, self.N))
            c = np.zeros(T)
            
            alpha[0] = self.Pi * self.B[:, self.obs_seq[0]]
            c[0] = 1.0 / (np.sum(alpha[0]) + 1e-10)
            alpha[0] *= c[0]
            
            for t in range(1, T):
                alpha[t] = np.dot(alpha[t-1], self.A) * self.B[:, self.obs_seq[t]]
                c[t] = 1.0 / (np.sum(alpha[t]) + 1e-10)
                alpha[t] *= c[t]
                
            # Backward
            beta = np.zeros((T, self.N))
            beta[T-1] = c[T-1]
            
            for t in range(T-2, -1, -1):
                beta[t] = np.dot(self.A, (self.B[:, self.obs_seq[t+1]] * beta[t+1])) * c[t]
                
            # Gamma & Xi
            gamma = np.zeros((T, self.N))
            xi = np.zeros((T-1, self.N, self.N))
            
            for t in range(T):
                gamma[t] = (alpha[t] * beta[t])
                gamma[t] /= (np.sum(gamma[t]) + 1e-10)
                
            for t in range(T-1):
                denom = np.zeros((self.N, self.N))
                for i in range(self.N):
                    for j in range(self.N):
                        xi[t, i, j] = alpha[t, i] * self.A[i, j] * self.B[j, self.obs_seq[t+1]] * beta[t+1, j]
                xi[t] /= (np.sum(xi[t]) + 1e-10)
                
            # M-Step
            self.Pi = gamma[0]
            self.A = np.sum(xi, axis=0) / (np.sum(gamma[:-1], axis=0)[:, np.newaxis] + 1e-10)
            
            for k in range(self.M):
                mask = (np.array(self.obs_seq) == k)
                self.B[:, k] = np.sum(gamma[mask], axis=0) / (np.sum(gamma, axis=0) + 1e-10)

    def print_results(self):
        print("\n=== Trained HMM Parameters ===")
        print("\n[Transition Matrix A]")
        print("      " + "  ".join([f"{self.rev_state_map[i]:>6}" for i in range(self.N)]))
        for i in range(self.N):
            print(f"{self.rev_state_map[i]:<4} " + "  ".join([f"{val:.4f}" for val in self.A[i]]))

        print("\n[Emission Matrix B]")
        print("      " + "  ".join([f"{self.rev_obs_map[i]:>8}" for i in range(self.M)]))
        for i in range(self.N):
            print(f"{self.rev_state_map[i]:<4} " + "  ".join([f"{val:.4f}" for val in self.B[i]]))

        print("\n[Initial Distribution Pi]")
        print("  ".join([f"{self.rev_state_map[i]}: {val:.4f}" for i, val in enumerate(self.Pi)]))

# --- User Input Zone ---
observations = ["Sunny", "Rainy", "Sunny", "Sunny", "Cloudy", "Rainy", "Sunny"]
n_states = 2

print(f"Observation Sequence: {observations}")
hmm = HMM(n_states, observations)
hmm.train(n_iter=50)
hmm.print_results()
