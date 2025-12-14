import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_db(url, name):
    try:
        client = AsyncIOMotorClient(url)
        await client.admin.command('ping')
        print(f'✅ {name}: Database connected successfully!')
        client.close()
        return True
    except Exception as e:
        print(f'❌ {name}: Database connection failed: {e}')
        return False

async def main():
    # Test first connection string
    url1 = 'mongodb://atlas-sql-693dd528fa951f0d3a541c77-j10mmn.a.query.mongodb.net/eyecare_ai?ssl=true&authSource=admin'
    await test_db(url1, 'Atlas SQL Connection')

    # Test second connection string (with password embedded)
    url2 = 'mongodb+srv://sajjadahmadcode_db_user:Y2ySSo55Ja4bYKNamongodb+srv://sajjadahmadcode_db_user:@cluster0.gr5hmtd.mongodb.net/?appName=Cluster0'
    await test_db(url2, 'Embedded Password Connection')

if __name__ == "__main__":
    asyncio.run(main())