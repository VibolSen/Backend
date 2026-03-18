const md5 = 'f06ec2970e9d73b3719a170199598ba7';
const url = 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5';

async function testWithToken() {
    console.log("=== Testing WITH Token ===");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJKdW5lIjp7ImlkIjoiNDIzNjhiYWQ2YTIwYTIwYTIwNDI5NjhiYjI5IiwidW9lIjp7ImVlMiJ9LCJpYXQiOjE3NDAzNzAzNDgsImVtYWlsIjoic3VwcG9ydEBiYWtvbmcubmJjLmdvdi5raCIsImV4cCI6MTc3ODExMTM0Mn0.j9MBeP0HM9bArHjbMWKWOQN8PwMa9iRF5fMMqrf6JKI`
            },
            body: JSON.stringify({ md5 })
        });
        const data = await res.json();
        console.log(data);
    } catch(e) { console.error(e) }
}

async function testWithoutToken() {
    console.log("=== Testing WITHOUT Token ===");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ md5 })
        });
        const data = await res.json();
        console.log(data);
    } catch(e) { console.error(e) }
}

async function run() {
    await testWithToken();
    await testWithoutToken();
}
run();
