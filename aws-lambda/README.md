# AWS Lambda Keep-Alive Function

This directory contains the code for an AWS Lambda function that pings your Render backend every 14 minutes to prevent it from going to sleep.

## Setup Instructions

### Step 1: Create a Lambda Function in AWS

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Click **Create function**
3. Choose **Author from scratch**
4. Fill in the details:
   - **Function name**: `render-keep-alive` (or any name you prefer)
   - **Runtime**: `Python 3.12` (or latest Python version)
   - **Architecture**: `x86_64`
5. Click **Create function**

### Step 2: Add the Code

1. In the Lambda console, find the **Code source** section
2. Copy the entire code from `lambda_function.py` in this directory
3. Paste it into the `lambda_function.py` file in the AWS console
4. Click **Deploy**

### Step 3: Create a CloudWatch EventBridge Rule

1. Go to [EventBridge Console](https://console.aws.amazon.com/events/)
2. Click **Create rule**
3. Fill in the details:
   - **Name**: `render-keep-alive-trigger` (or any name)
   - **Description**: `Trigger Lambda every 14 minutes to keep Render app awake`
   - **Rule type**: `Scheduled pattern`
4. For the schedule expression, use: `rate(14 minutes)`
5. Click **Next**
6. For the target:
   - **Target type**: `AWS service`
   - **Service**: `Lambda function`
   - **Function**: Select `render-keep-alive` (the function you just created)
7. Click **Create rule**

### Step 4: Verify It's Working

1. Go back to the Lambda function
2. Click **Test** (top right)
3. Create a test event with any name (defaults are fine)
4. Click **Test** again
5. You should see a successful response with status code 200

That's it! Your Lambda function will now ping your Render backend automatically every 14 minutes, keeping it awake indefinitely.

## How It Works

- **AWS Lambda**: Executes the Python function (completely free within the free tier)
- **CloudWatch EventBridge**: Triggers the Lambda on a schedule every 14 minutes (completely free)
- **Your Render Backend**: Receives a GET request to `/ping` and stays awake

## Costs

✅ **Completely Free!** 
- Lambda: 1,000,000 free requests/month (you only use ~40,320/month = 3% of free tier)
- CloudWatch: Free tier covers your use case
- Your GitHub Student Pack credits are not even touched!

## URL Configuration

The function currently pings: `https://baum-welch-hmm-model.onrender.com/ping`

If you change your Render URL, update the `url` variable in `lambda_function.py` line 13.
