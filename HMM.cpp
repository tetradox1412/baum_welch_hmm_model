#include <iostream>
#include <vector>
#include <cmath>
#include <iomanip>
#include <numeric>
#include <cstdlib>
#include <ctime>

using namespace std;

class HMM {
public:
    int N; // Number of hidden states
    int M; // Number of distinct observation symbols
    vector<vector<double>> A; // Transition probability matrix [N][N]
    vector<vector<double>> B; // Emission probability matrix [N][M]
    vector<double> Pi; // Initial state probability vector [N]

    HMM(int n, int m) : N(n), M(m) {
        srand(time(0));
        // Initialize A
        A.resize(N, vector<double>(N));
        for (int i = 0; i < N; i++) {
            double sum = 0;
            for (int j = 0; j < N; j++) {
                A[i][j] = (double)rand() / RAND_MAX;
                sum += A[i][j];
            }
            for (int j = 0; j < N; j++) A[i][j] /= sum;
        }

        // Initialize B
        B.resize(N, vector<double>(M));
        for (int i = 0; i < N; i++) {
            double sum = 0;
            for (int j = 0; j < M; j++) {
                B[i][j] = (double)rand() / RAND_MAX;
                sum += B[i][j];
            }
            for (int j = 0; j < M; j++) B[i][j] /= sum;
        }

        // Initialize Pi
        Pi.resize(N);
        double sum = 0;
        for (int i = 0; i < N; i++) {
            Pi[i] = (double)rand() / RAND_MAX;
            sum += Pi[i];
        }
        for (int i = 0; i < N; i++) Pi[i] /= sum;
    }

    void forward(const vector<int>& obs, vector<vector<double>>& alpha, vector<double>& c) {
        int T = obs.size();
        alpha.assign(T, vector<double>(N, 0.0));
        c.assign(T, 0.0);

        // Initialization
        for (int i = 0; i < N; i++) {
            alpha[0][i] = Pi[i] * B[i][obs[0]];
            c[0] += alpha[0][i];
        }

        c[0] = 1.0 / c[0];
        for (int i = 0; i < N; i++) {
            alpha[0][i] *= c[0];
        }

        // Induction
        for (int t = 1; t < T; t++) {
            for (int j = 0; j < N; j++) {
                double sum = 0;
                for (int i = 0; i < N; i++) {
                    sum += alpha[t - 1][i] * A[i][j];
                }
                alpha[t][j] = sum * B[j][obs[t]];
                c[t] += alpha[t][j];
            }
            c[t] = 1.0 / c[t];
            for (int j = 0; j < N; j++) {
                alpha[t][j] *= c[t];
            }
        }
    }

    void backward(const vector<int>& obs, const vector<double>& c, vector<vector<double>>& beta) {
        int T = obs.size();
        beta.assign(T, vector<double>(N, 0.0));

        for (int i = 0; i < N; i++) {
            beta[T - 1][i] = c[T - 1]; // Scaled beta initialization
        }

        for (int t = T - 2; t >= 0; t--) {
            for (int i = 0; i < N; i++) {
                double sum = 0;
                for (int j = 0; j < N; j++) {
                    sum += A[i][j] * B[j][obs[t + 1]] * beta[t + 1][j];
                }
                beta[t][i] = sum * c[t]; // Scaling
            }
        }
    }

    // History of log-likelihoods for convergence analysis
    vector<double> history;

    // Modified train to track history
    void train(const vector<vector<int>>& observations, int maxIter) {
        history.clear();
        for (int iter = 0; iter < maxIter; iter++) {
            vector<vector<double>> numerA(N, vector<double>(N, 0.0));
            vector<double> denomA(N, 0.0);
            vector<vector<double>> numerB(N, vector<double>(M, 0.0));
            vector<double> denomB(N, 0.0);
            vector<double> numerPi(N, 0.0);
            
            double iterLogLikelihood = 0;

            for (const auto& obs : observations) {
                int T = obs.size();
                vector<vector<double>> alpha, beta;
                vector<double> c;
                
                forward(obs, alpha, c);
                backward(obs, c, beta);
                
                // Compute Log Likelihood for this sequence
                double seqLogLikelihood = 0;
                for(double val : c) seqLogLikelihood -= log(val);
                iterLogLikelihood += seqLogLikelihood;

                // Compute Gamma and Xi
                vector<vector<double>> gamma(T, vector<double>(N));
                vector<vector<vector<double>>> xi(T - 1, vector<vector<double>>(N, vector<double>(N)));
                
                for (int t = 0; t < T; t++) {
                    double denom = 0;
                    for (int i = 0; i < N; i++) denom += alpha[t][i] * beta[t][i];
                    for (int i = 0; i < N; i++) gamma[t][i] = (alpha[t][i] * beta[t][i]) / denom;
                }
                
                for (int t = 0; t < T - 1; t++) {
                    double denom = 0;
                    for (int i = 0; i < N; i++) {
                        for (int j = 0; j < N; j++) {
                            denom += alpha[t][i] * A[i][j] * B[j][obs[t+1]] * beta[t+1][j];
                        }
                    }
                    for (int i = 0; i < N; i++) {
                        for (int j = 0; j < N; j++) {
                            xi[t][i][j] = (alpha[t][i] * A[i][j] * B[j][obs[t+1]] * beta[t+1][j]) / denom;
                        }
                    }
                }
                
                // Accumulate updates
                for (int i = 0; i < N; i++) {
                    numerPi[i] += gamma[0][i];
                    for (int j = 0; j < N; j++) {
                        double sumXi = 0;
                        for (int t = 0; t < T - 1; t++) sumXi += xi[t][i][j];
                        numerA[i][j] += sumXi;
                    }
                    double sumGamma = 0;
                    for (int t = 0; t < T - 1; t++) sumGamma += gamma[t][i];
                    denomA[i] += sumGamma;
                    
                    for (int m_sym = 0; m_sym < M; m_sym++) {
                         double sumGammaObs = 0;
                         for(int t=0; t<T; t++) {
                             if(obs[t] == m_sym) sumGammaObs += gamma[t][i];
                         }
                         numerB[i][m_sym] += sumGammaObs;
                    }
                    double sumGammaAll = 0;
                    for(int t=0; t<T; t++) sumGammaAll += gamma[t][i];
                    denomB[i] += sumGammaAll;
                }
            }
            
            history.push_back(iterLogLikelihood);

            // M-Step: Update parameters
            for (int i = 0; i < N; i++) {
                Pi[i] = numerPi[i] / observations.size();
                for (int j = 0; j < N; j++) A[i][j] = numerA[i][j] / denomA[i];
                for (int j = 0; j < M; j++) B[i][j] = numerB[i][j] / denomB[i];
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
            for (int j = 0; j < N; j++) cout << fixed << setprecision(6) << A[i][j] << (j < N - 1 ? ", " : "");
            cout << "]" << (i < N - 1 ? "," : "") << endl;
        }
        cout << "  ]," << endl;
        cout << "  \"B\": [" << endl;
        for (int i = 0; i < N; i++) {
            cout << "    [";
            for (int j = 0; j < M; j++) cout << fixed << setprecision(6) << B[i][j] << (j < M - 1 ? ", " : "");
            cout << "]" << (i < N - 1 ? "," : "") << endl;
        }
        cout << "  ]," << endl;
        cout << "  \"Pi\": [";
        for (int i = 0; i < N; i++) cout << fixed << setprecision(6) << Pi[i] << (i < N - 1 ? ", " : "");
        cout << "]" << endl;
        cout << "}" << endl;
    }
};

int main() {
    int N, M, K;
    if (!(cin >> N >> M >> K)) return 0;
    
    vector<vector<int>> obs(K);
    for (int k = 0; k < K; k++) {
        int T;
        cin >> T;
        obs[k].resize(T);
        for (int t = 0; t < T; t++) cin >> obs[k][t];
    }

    clock_t start = clock();
    HMM hmm(N, M);
    hmm.train(obs, 50); // Reduced iterations for speed in demo, or keep 100
    clock_t end = clock();
    double execTime = double(end - start) / CLOCKS_PER_SEC;

    hmm.printJSON(execTime);
    
    return 0;
}
