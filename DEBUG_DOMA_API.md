# Doma API Debug Guide

## Issues Found with Browse Domains

### 1. **Fixed: Incorrect useNames Hook Call**
- **Problem**: The `useNames` hook was being called with an object instead of individual parameters
- **Fix**: Updated to call with correct parameters: `useNames(take, listed, name, tlds)`

### 2. **Environment Variables Missing**
The app needs these environment variables in `.env.local`:

```bash
NEXT_PUBLIC_DOMA_GRAPHQL_URL=https://api.doma.dev/graphql
NEXT_PUBLIC_DOMA_API_KEY=your_api_key_here
```

### 3. **Debug Information Added**
- Added console logging to see what data is being returned
- Added error handling in the UI
- Check browser console for debug output

### 4. **How to Debug**

1. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for "Browse Domains Debug" logs
   - Check for any error messages

2. **Check Network Tab**:
   - Look for GraphQL requests to `api.doma.dev`
   - Check if requests are failing (red status)
   - Look at response data

3. **Common Issues**:
   - **No API Key**: App will work but with limited data
   - **Network Error**: Check internet connection
   - **CORS Error**: API might not allow browser requests
   - **Invalid Response**: API might be returning unexpected data structure

### 5. **Expected Data Structure**
The API should return:
```json
{
  "data": {
    "names": {
      "items": [...],
      "totalCount": 123,
      "currentPage": 1,
      "hasNextPage": true
    }
  }
}
```

### 6. **Next Steps**
1. Create `.env.local` file with API credentials
2. Check browser console for debug output
3. Verify API is returning data in expected format
4. Check if there are any CORS or authentication issues
