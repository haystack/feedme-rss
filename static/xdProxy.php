<?php
// Website url to open
$url = $_GET['url'];

// SECURITY MEASURE -- we're going to require a whitelist
$whitelist = ['http://feedme.csail.mit.edu', 'http://docs.google.com'];
$found = false;
foreach ($whitelist as $whitesite) {
  $loc = strpos($url, $whitesite);
  if ($loc === true && $loc == 0) {
    $found = true;
  }
}

if (!$found) {
  echo "ERROR BAD DOMAIN FOR FEEDME XD COMMUNICATION IN XDPROXY.PHP";
  return;
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
$output = curl_exec($ch);
echo $output;
curl_close($ch);
?>