from flask import Flask, request, jsonify
import subprocess
import json
import os
import sys
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/train', methods=['POST'])
def train():
    data = request.json
    N = data.get('N')
    M = data.get('M')
    observations = data.get('observations') # List of lists

    if N is None or M is None or observations is None:
        return jsonify({"error": "Missing parameters N, M, or observations"}), 400

    # Prepare input for C++ executable
    # Format: N M K (number of seqs)
    # T1
    # o1 o2 ...
    # ...
    input_str = f"{N} {M} {len(observations)}\n"
    for obs in observations:
        input_str += f"{len(obs)}\n"
        input_str += " ".join(map(str, obs)) + "\n"

    # Run HMM.exe
    # Assuming HMM.exe is in the parent directory relative to this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    hmm_exe = os.path.join(base_dir, '..', 'HMM.exe')
    hmm_bin = os.path.join(base_dir, '..', 'HMM')
    
    if os.path.exists(hmm_exe):
        hmm_path = hmm_exe
    elif os.path.exists(hmm_bin):
        hmm_path = hmm_bin
    else:
         return jsonify({"error": "HMM executable not found"}), 500

    try:
        process = subprocess.Popen(
            [hmm_path], 
            stdin=subprocess.PIPE, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True
        )
        stdout, stderr = process.communicate(input=input_str)

        if process.returncode != 0:
            return jsonify({"error": "HMM execution failed", "stderr": stderr}), 500

        result = json.loads(stdout)
        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse HMM output", "stdout": stdout, "stderr": stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
