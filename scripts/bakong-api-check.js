const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the Backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const BAKONG_API_URL = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh/v1';
const BAKONG_API_TOKEN = process.env.BAKONG_API_TOKEN;

async function checkBakongStatus(md5) {
    if (!BAKONG_API_TOKEN) {
        console.error("❌ Error: BAKONG_API_TOKEN is missing in .env file.");
        return;
    }

    console.log("--------------------------------------------------");
    console.log("🚀 Bakong API Diagnostic Tool");
    console.log(`📡 URL: ${BAKONG_API_URL}`);
    console.log(`🔑 Token: ${BAKONG_API_TOKEN.substring(0, 10)}...`);
    console.log(`🔍 MD5: ${md5 || 'N/A'}`);
    console.log("--------------------------------------------------\n");

    try {
        const response = await fetch(`${BAKONG_API_URL}/check_transaction_by_md5`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BAKONG_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ md5: md5 || "test_md5_hash" })
        });

        const data = await response.json();
        
        console.log("📦 RAW DATA RECEIVED FROM BAKONG:");
        console.log(JSON.stringify(data, null, 2));
        console.log("\n--------------------------------------------------");
        
        if (data.responseCode === 0 && data.data) {
            console.log("✅ SUCCESS: Transaction data found.");
            console.log(`💰 Amount: ${data.data.amount}`);
            console.log(`💱 Currency: ${data.data.currency}`);
            console.log(`🏦 Sender: ${data.data.senderName}`);
        } else {
            console.log("ℹ️ INFO: Bakong returned an error or no data (this is normal if the MD5 is invalid/expired).");
            console.log(`💬 Message: ${data.responseMessage || 'N/A'}`);
        }
    } catch (error) {
        console.error("❌ FATAL CONNECTION ERROR:", error.message);
    }
}

// Run the check (using a dummy MD5 or one passed via CLI)
const md5Arg = process.argv[2];
checkBakongStatus(md5Arg);
