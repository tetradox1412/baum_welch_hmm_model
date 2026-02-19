#include <iostream>
#include <vector>
#include <cmath>
#include <iomanip>
#include <numeric>
#include <cstdlib>
#include <ctime>
#include <algorithm>

using namespace std;

class HMM {
public:
    int N; // Number of hidden states
    int M; // Number of distinct observation symbols
    vector<double> A; // Transition probability matrix [N * N]
    vector<double> B; // Emission probability matrix [N * M]
    vector<double> Pi; // Initial state probability vector [N]

    // Workspace buffers to avoid frequent reallocations
    vector<double> alpha;
    vector<double> beta;
    vector<double> c;
    vector<double> gamma;
    vector<double> xi;

    HMM(int n, int m) : N(n), M(m) {
        srand(time(0));
        
        // Initialize A (N x N)
        A.resize(N * N);
        for (int i = 0; i < N; i++) {
            double sum = 0;
            for (int j = 0; j < N; j++) {
                double val = (double)rand() / RAND_MAX;
                A[i * N + j] = val;
                sum += val;
            }
            for (int j = 0; j < N; j++) A[i * N + j] /= sum;
        }

        // Initialize B (N x M)
        B.resize(N * M);
        for (int i = 0; i < N; i++) {
            double sum = 0;
            for (int j = 0; j < M; j++) {
                double val = (double)rand() / RAND_MAX;
                B[i * M + j] = val;
                sum += val;
            }
            for (int j = 0; j < M; j++) B[i * M + j] /= sum;
        }

        // Initialize Pi (N)
        Pi.resize(N);
        double sum = 0;
        for (int i = 0; i < N; i++) {
            Pi[i] = (double)rand() / RAND_MAX;
            sum += Pi[i];
        }
        for (int i = 0; i < N; i++) Pi[i] /= sum;
    }

    void forward(const vector<int>& obs, int T) {
        alpha.assign(T * N, 0.0);
        c.assign(T, 0.0);

        // Initialization (t = 0)
        for (int i = 0; i < N; i++) {
            double val = Pi[i] * B[i * M + obs[0]];
            alpha[i] = val; // alpha[0][i] -> alpha[i]
            c[0] += val;
        }

        // Scale c[0]
        c[0] = 1.0 / (c[0] + 1e-100); // Prevent division by zero
        for (int i = 0; i < N; i++) {
            alpha[i] *= c[0];
        }

        // Induction
        for (int t = 1; t < T; t++) {
            for (int j = 0; j < N; j++) {
                double sum = 0;
                for (int i = 0; i < N; i++) {
                    sum += alpha[(t - 1) * N + i] * A[i * N + j];
                }
                double val = sum * B[j * M + obs[t]];
                alpha[t * N + j] = val;
                c[t] += val;
            }
            // Scale c[t]
            c[t] = 1.0 / (c[t] + 1e-100);
            for (int j = 0; j < N; j++) {
                alpha[t * N + j] *= c[t];
            }
        }
    }

    void backward(const vector<int>& obs, int T) {
        beta.assign(T * N, 0.0);

        // Initialization (t = T - 1)
        for (int i = 0; i < N; i++) {
            beta[(T - 1) * N + i] = c[T - 1]; // Scaled beta initialization
        }

        // Induction
        for (int t = T - 2; t >= 0; t--) {
            for (int i = 0; i < N; i++) {
                double sum = 0;
                for (int j = 0; j < N; j++) {
                    sum += A[i * N + j] * B[j * M + obs[t + 1]] * beta[(t + 1) * N + j];
                }
                beta[t * N + i] = sum * c[t]; // Scaling
            }
        }
    }

    // History of log-likelihoods for convergence analysis
    vector<double> history;

    // Modified train to track history
    void train(const vector<vector<int>>& observations, int maxIter) {
        history.clear();
        
        // Workspace for accumulators
        vector<double> numerA(N * N);
        vector<double> denomA(N);
        vector<double> numerB(N * M);
        vector<double> denomB(N);
        vector<double> numerPi(N);

        for (int iter = 0; iter < maxIter; iter++) {
            // Reset accumulators
            fill(numerA.begin(), numerA.end(), 0.0);
            fill(denomA.begin(), denomA.end(), 0.0);
            fill(numerB.begin(), numerB.end(), 0.0);
            fill(denomB.begin(), denomB.end(), 0.0);
            fill(numerPi.begin(), numerPi.end(), 0.0);
            
            double iterLogLikelihood = 0;

            for (const auto& obs : observations) {
                int T = obs.size();
                
                // Compute Forward and Backward variables
                // Reuses internal alpha, beta, c vectors
                forward(obs, T);
                backward(obs, T);
                
                // Compute Log Likelihood for this sequence
                double seqLogLikelihood = 0;
                for(double val : c) seqLogLikelihood -= log(val);
                iterLogLikelihood += seqLogLikelihood;

                // Compute Gamma and Xi, and accumulate
                // Instead of storing full Gamma and Xi matrices, we compute and accumulate on the fly
                // or store strictly what's needed for the current time step.
                // However, Gamma IS needed for numerB and numerPi logic, so we keep Gamma buffers.
                // Xi can be computed on the fly.

                // Resize gamma if needed (reusing memory if capacity allows)
                gamma.assign(T * N, 0.0); 

                for (int t = 0; t < T; t++) {
                    double denom = 0;
                    for (int i = 0; i < N; i++) {
                        // gamma[t][i] unnormalized
                        double val = alpha[t * N + i] * beta[t * N + i];
                        gamma[t * N + i] = val;
                        denom += val;
                    }
                    // Normalize gamma
                    for (int i = 0; i < N; i++) {
                        gamma[t * N + i] /= (denom + 1e-100);
                    }
                }
                
                // Accumulate updates
                for (int i = 0; i < N; i++) {
                    numerPi[i] += gamma[0 * N + i]; // gamma at t=0
                }

                // A and B accumulators
                for (int t = 0; t < T - 1; t++) {
                    double denom = 0;
                    // Compute denominator for Xi (P(O|lambda))
                    for (int i = 0; i < N; i++) {
                        for (int j = 0; j < N; j++) {
                            denom += alpha[t * N + i] * A[i * N + j] * B[j * M + obs[t+1]] * beta[(t+1) * N + j];
                        }
                    }

                    for (int i = 0; i < N; i++) {
                        denomA[i] += gamma[t * N + i];
                        
                        for (int j = 0; j < N; j++) {
                            double xi_val = (alpha[t * N + i] * A[i * N + j] * B[j * M + obs[t+1]] * beta[(t+1) * N + j]) / (denom + 1e-100);
                            numerA[i * N + j] += xi_val;
                        }
                    }
                }

                // Denom B and Numer B
                for (int i = 0; i < N; i++) {
                    // denomA loop above only goes to T-1, but denomB needs sum over T
                    // We can reuse gamma sums.
                    double sumGamma = 0;
                    for(int t = 0; t < T; t++) {
                        double g = gamma[t * N + i];
                        sumGamma += g;
                        numerB[i * M + obs[t]] += g;
                    }
                    denomB[i] += sumGamma;
                    
                    // Note: Standard Baum-Welch: denomA is sum(gamma) from 0 to T-2.
                    // Our previous denomA loop did exactly that (t < T-1).
                    // BUT we need to check if denomA logic matches standard "number of transitions from i".
                    // Yes, sum(gamma, t=0..T-2) is expected number of transitions out of i.
                    // numerA is expected number of transitions from i to j.
                }

            }
            
            history.push_back(iterLogLikelihood);

            // M-Step: Update parameters
            for (int i = 0; i < N; i++) {
                Pi[i] = numerPi[i] / observations.size();
                for (int j = 0; j < N; j++) {
                    A[i * N + j] = numerA[i * N + j] / (denomA[i] + 1e-100);
                }
                for (int j = 0; j < M; j++) {
                    B[i * M + j] = numerB[i * M + j] / (denomB[i] + 1e-100);
                }
            }
        }
    }

    void printJSON(double execTime) {
        cout << "{" << endl;
        cout << "  \"N\": " << N << "," << endl;
        cout << "  \"M\": " << M << "," << endl;
        cout << "  \"executionTime\": " << fixed << setprecision(6) << execTime << "," << endl;
        
        cout << "  \"history\": [" << endl;
        for(size_t i=0; i<history.size(); i++) {
            cout << "    { \"iter\": " << i << ", \"logLikelihood\": " << history[i] << " }" << (i < history.size()-1 ? "," : "") << endl;
        }
        cout << "  ]," << endl;

        cout << "  \"A\": [" << endl;
        for (int i = 0; i < N; i++) {
            cout << "    [";
            for (int j = 0; j < N; j++) cout << fixed << setprecision(6) << A[i * N + j] << (j < N - 1 ? ", " : "");
            cout << "]" << (i < N - 1 ? "," : "") << endl;
        }
        cout << "  ]," << endl;
        cout << "  \"B\": [" << endl;
        for (int i = 0; i < N; i++) {
            cout << "    [";
            for (int j = 0; j < M; j++) cout << fixed << setprecision(6) << B[i * M + j] << (j < M - 1 ? ", " : "");
            cout << "]" << (i < N - 1 ? "," : "") << endl;
        }
        cout << "  ]," << endl;
        cout << "  \"Pi\": [";
        for (int i = 0; i < N; i++) cout << fixed << setprecision(6) << Pi[i] << (i < N - 1 ? ", " : "");
        cout << "]" << endl;
        cout << "}" << endl;
    }

    // Method to set parameters manually
    void setParameters(const vector<double>& newA, const vector<double>& newB, const vector<double>& newPi) {
        A = newA;
        B = newB;
        Pi = newPi;
    }
};

int main() {
    // Optimize I/O operations
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N, M, K;
    if (!(cin >> N >> M >> K)) return 0;

    // Check for optional initialization mode
    // 0 = random (default), 1 = custom
    int initMode = 0;
    cin >> initMode;
    
    vector<vector<int>> obs(K);
    for (int k = 0; k < K; k++) {
        int T;
        cin >> T;
        obs[k].resize(T);
        for (int t = 0; t < T; t++) cin >> obs[k][t];
    }

    HMM hmm(N, M);

    // If custom initialization mode is enabled, read matrices
    if (initMode == 1) {
        vector<double> customA(N * N);
        vector<double> customB(N * M);
        vector<double> customPi(N);

        for (int i = 0; i < N * N; i++) cin >> customA[i];
        for (int i = 0; i < N * M; i++) cin >> customB[i];
        for (int i = 0; i < N; i++) cin >> customPi[i];

        hmm.setParameters(customA, customB, customPi);
    }

    clock_t start = clock();
    hmm.train(obs, 50); 
    clock_t end = clock();
    double execTime = double(end - start) / CLOCKS_PER_SEC;

    hmm.printJSON(execTime);
    
    return 0;
}
