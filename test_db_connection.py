import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def test_db():
    try:
        mongodb_url = os.getenv('MONGODB_URL', 'mongodb+srv://sajjadahmadcode_db_user:Y2ySSo55Ja4bYKNa@cluster0.gr5hmtd.mongodb.net/eyecare_ai?retryWrites=true&w=majority')
        print(f"Testing connection to: {mongodb_url}")
        client = AsyncIOMotorClient(mongodb_url)
        db = client.eyecare_ai
        await client.admin.command('ping')
        print('✅ Database connected successfully!')
        client.close()
    except Exception as e:
        print(f'❌ Database connection failed: {e}')

if __name__ == "__main__":
    asyncio.run(test_db())