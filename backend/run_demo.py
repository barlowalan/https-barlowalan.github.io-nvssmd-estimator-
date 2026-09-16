#!/usr/bin/env python3
"""Run SEP Explorer API with an in-memory mongomock database (dev/demo)."""
import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "sep_explorer_demo")

from mongomock_motor import AsyncMongoMockClient
import motor.motor_asyncio as motor_asyncio

motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient

import uvicorn

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
