import asyncio
import aiohttp
import sys

API_BASE = "http://localhost:8000/api"

async def create_test_resource(session):
    async with session.post(f"{API_BASE}/resources", json={
        "type": "test2",
        "identifier": "concurrency-test-resource"
    }) as resp:
        if resp.status in (200, 409):
            data = await resp.json()
            return data.get("id")
        return None

async def acquire_lock(session, resource_id, owner_id):
    try:
        async with session.post(f"{API_BASE}/locks/acquire", json={
            "resource_id": resource_id,
            "owner_id": owner_id,
            "ttl_seconds": 60
        }) as resp:
            return (owner_id, resp.status, await resp.json())
    except Exception as e:
        return (owner_id, None, str(e))

async def main():
    num_requests = 50
    
    async with aiohttp.ClientSession() as session:
        print("Creating test resource...")
        resource_id = await create_test_resource(session)
        if not resource_id:
            print("Failed to create resource")
            return
        
        print(f"Resource ID: {resource_id}")
        print(f"Sending {num_requests} parallel acquire requests...")
        
        tasks = [acquire_lock(session, resource_id, f"owner-{i}") for i in range(num_requests)]
        results = await asyncio.gather(*tasks)
        
        successes = [r for r in results if r[1] == 200]
        conflicts = [r for r in results if r[1] == 409]
        errors = [r for r in results if r[1] not in (200, 409)]
        
        print(f"\n{'='*60}")
        print(f"RESULTS:")
        print(f"{'='*60}")
        print(f"✓ Successful acquisitions: {len(successes)}")
        print(f"✗ Conflicts (409): {len(conflicts)}")
        print(f"✗ Errors: {len(errors)}")
        print(f"{'='*60}")
        
        if successes:
            print(f"\nSuccessful owner: {successes[0][0]}")
        
        if len(successes) != 1:
            print("\n⚠️  WARNING: Expected exactly 1 success due to lock exclusivity!")
            sys.exit(1)
        else:
            print("\n✓ Concurrency test PASSED: Only one lock acquired!")

if __name__ == "__main__":
    asyncio.run(main())
