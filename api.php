<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$baseUrl = 'http://api2.xbzhan.com';

function sendRequest($endpoint, $method = 'POST', $data = null) {
    global $baseUrl;
    
    $url = $baseUrl . $endpoint;
    
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json; charset=utf-8',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return [
            'success' => false,
            'error' => 'CURL错误: ' . $error,
            'http_code' => $httpCode
        ];
    }
    
    if ($httpCode !== 200) {
        return [
            'success' => false,
            'error' => 'HTTP错误: ' . $httpCode,
            'response' => $response
        ];
    }
    
    $decoded = json_decode($response, true);
    if ($decoded === null) {
        return [
            'success' => false,
            'error' => 'JSON解析失败',
            'raw_response' => $response
        ];
    }
    
    return [
        'success' => true,
        'data' => $decoded
    ];
}

$input = file_get_contents('php://input');
$requestData = json_decode($input, true);

if (!$requestData) {
    echo json_encode([
        'success' => false,
        'error' => '无效的请求数据'
    ]);
    exit();
}

$endpoint = isset($requestData['endpoint']) ? $requestData['endpoint'] : '';
$method = isset($requestData['method']) ? $requestData['method'] : 'POST';
$data = isset($requestData['data']) ? $requestData['data'] : null;

if (empty($endpoint)) {
    echo json_encode([
        'success' => false,
        'error' => '缺少endpoint参数'
    ]);
    exit();
}

$result = sendRequest($endpoint, $method, $data);

echo json_encode($result);
?>