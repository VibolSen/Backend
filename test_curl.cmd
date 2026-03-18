@echo off
curl -X POST https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5 ^
-H "Authorization: Bearer %BAKONG_JWT%" ^
-H "Content-Type: application/json" ^
-d "{\"md5\":\"f06ec2970e9d73b3719a170199598ba7\"}"
