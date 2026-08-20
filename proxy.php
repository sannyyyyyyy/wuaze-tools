<?php
/* ============================================================
   Wuaze Mail Proxy (proxy.php)
   ------------------------------------------------------------
   Tarayıcı CORS engeli nedeniyle api.mail.tm'ye doğrudan
   erişilemiyor. Bu dosya, sayfa ile aynı alan adında durur ve
   SADECE api.mail.tm'ye vekillik eder (başka host'a izin yok).

   Kullanım: proxy.php?p=/domains
             proxy.php?p=/accounts        (POST)
             proxy.php?p=/token           (POST)
             proxy.php?p=/messages        (GET, Authorization)
             proxy.php?p=/messages/{id}   (GET, Authorization)

   index.html ile AYNI KLASÖRE yükleyin (örn. https://toolss.wuaze.com/proxy.php)
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: content-type, authorization, accept');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Max-Age: 86400');

/* CORS preflight - her zaman 204 dön */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $h = array();
        foreach ($_SERVER as $k => $v) {
            if (substr($k, 0, 5) === 'HTTP_') {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($k, 5)))));
                $h[$name] = $v;
            }
        }
        return $h;
    }
}

$path = isset($_GET['p']) ? (string)$_GET['p'] : '';
if ($path === '' || $path[0] !== '/') {
    http_response_code(400);
    echo json_encode(array('error' => 'p parametresi gerekli (örn. ?p=/domains)'));
    exit;
}

/* Güvenlik: yalnızca api.mail.tm'ye izin ver */
$url = 'https://api.mail.tm' . $path;

$method = $_SERVER['REQUEST_METHOD'];
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TCP_KEEPALIVE, 1);

/* Host, Content-Length, Connection header'ları filtrele */
$headers = array();
foreach (getallheaders() as $name => $value) {
    $lname = strtolower($name);
    if ($lname === 'host' || $lname === 'content-length' || $lname === 'connection') continue;
    $headers[] = $name . ': ' . $value;
}
if (count($headers)) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$body = file_get_contents('php://input');
if ($body !== '' && in_array($method, array('POST', 'PUT', 'PATCH'))) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$resp = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($resp === false) {
    http_response_code(502);
    echo json_encode(array('error' => 'curl: ' . curl_error($ch)));
    curl_close($ch);
    exit;
}
curl_close($ch);

/* Upstream'den dönen JSON'u olduğu gibi aktar */
http_response_code($code > 0 ? $code : 200);
echo $resp;