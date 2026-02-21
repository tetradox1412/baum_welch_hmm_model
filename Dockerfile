FROM python:3.10-slim

# Install g++ to compile the C++ code during the image build
RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY backend/requirements.txt /app/backend/

# Install any needed Python packages
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the application
COPY . /app/

# Compile the C++ program
RUN g++ -O3 HMM.cpp -o HMM

# Ensure the binary has execute permissions
RUN chmod +x HMM

# Change working directory to the backend directory
WORKDIR /app/backend

# Expose the port (many deployment platforms look for 5000 or a custom $PORT)
EXPOSE 5000

# Run gunicorn server when the container launches
CMD gunicorn -w 4 -b 0.0.0.0:${PORT:-5000} app:app
