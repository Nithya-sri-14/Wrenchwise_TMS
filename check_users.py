import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
async def check():
    async with AsyncSessionLocal() as s:
        res = await s.execute(select(User))
        users = res.scalars().all()
        print(f'User count: {len(users)}')
        for u in users:
            print(f'User: {u.username}, Active: {u.is_active}, Role: {u.role}')
asyncio.run(check())
