import urllib.request
import json

def lambda_handler(event, context):
    """
    AWS Lambda function to ping the Render backend every 14 minutes
    to prevent it from going to sleep.
    
    Triggered by CloudWatch EventBridge rule.
    """
    
    url = "https://baum-welch-hmm-model.onrender.com/ping"
    
    try:
        # Send GET request to the ping endpoint
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.status
            
            print(f"Ping successful! Status code: {status_code}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Ping successful',
                    'status_code': status_code,
                    'url': url
                })
            }
    
    except Exception as e:
        print(f"Ping failed: {str(e)}")
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Ping failed',
                'error': str(e),
                'url': url
            })
        }
