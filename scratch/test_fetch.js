const customerToken = 'YXN3X2Npc19jdXN0b21lcjphc3dfY2lzX2N1c3RvbWVyQDIwMjMh';
const masterToken = 'Y3VzdG9tZXJtYW5hZ2VtZW50OmN1c3RvbWVybWFuYWdlbWVudEAyMDE4';

const url = 'https://aswinno.assetwise.co.th/cisuat/api/Customer/GetContactLogRegister';

const tokens = [
  { name: 'Customer Token', value: customerToken },
  { name: 'Master Token', value: masterToken }
];

async function test() {
  for (const token of tokens) {
    console.log(`\n========================================`);
    console.log(`UAT URL: ${url}`);
    console.log(`Token: ${token.name}`);
    console.log(`========================================`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token.value}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          utm_source: 'creatorclub'
        })
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log('Headers:', Object.fromEntries(res.headers.entries()));
      console.log('Body:', await res.text());
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

test();
