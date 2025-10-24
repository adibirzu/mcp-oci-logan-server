# API Reference

Official Oracle Cloud Infrastructure (OCI) Logging Analytics API documentation and reference for the MCP OCI Logan Server.

---

## Table of Contents

1. [Official OCI Documentation](#official-oci-documentation)
2. [API Endpoints Used](#api-endpoints-used)
3. [Authentication](#authentication)
4. [Request/Response Format](#requestresponse-format)
5. [Rate Limits](#rate-limits)
6. [API Operations by Tool](#api-operations-by-tool)
7. [Common Parameters](#common-parameters)
8. [Error Codes](#error-codes)
9. [Best Practices](#best-practices)

---

## Official OCI Documentation

### Primary Documentation

**OCI Logging Analytics Service**
- Main Documentation: https://docs.oracle.com/en-us/iaas/logging-analytics/home.htm
- Getting Started: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/get-started-logging-analytics.html

**API References**

| API | Documentation URL | Purpose |
|-----|-------------------|---------|
| **Log Analytics API** | https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/ | Query execution, resource management |
| **Log Analytics Data API** | https://docs.oracle.com/en-us/iaas/api/#/en/logan-data-api/20200601/ | Data ingestion and retrieval |
| **Management Dashboard API** | https://docs.oracle.com/en-us/iaas/api/#/en/managementdashboard/20200901/ | Dashboard operations |

### SDK Documentation

**Python SDK** (Used by MCP Server)
- OCI Python SDK: https://docs.oracle.com/en-us/iaas/tools/python/latest/
- Log Analytics Module: https://docs.oracle.com/en-us/iaas/tools/python/latest/api/log_analytics.html
- Client Reference: https://docs.oracle.com/en-us/iaas/tools/python/latest/api/log_analytics/client/oci.log_analytics.LogAnalyticsClient.html

**Node.js SDK** (Alternative)
- OCI TypeScript/JavaScript SDK: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/typescriptsdk.htm
- NPM Package: https://www.npmjs.com/package/oci-sdk

### Query Language Reference

**OCI Logging Analytics Query Language**
- Query Language Guide: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/query-language.html
- Query Commands Reference: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/query-commands.html
- Field Reference: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/field-reference.html
- Functions and Operators: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/functions-and-operators.html

### Tutorial and Guides

**Logging Analytics Tutorials**
- Quick Start Tutorial: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/quick-start-tutorial.html
- Security Monitoring: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/security-monitoring.html
- Performance Monitoring: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/performance-monitoring.html

**Best Practices**
- Logging Analytics Best Practices: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/best-practices.html
- Query Optimization: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/optimize-queries.html

---

## API Endpoints Used

### Base URLs by Region

```
Format: https://loganalytics.{region}.oci.oraclecloud.com

Examples:
- us-ashburn-1: https://loganalytics.us-ashburn-1.oci.oraclecloud.com
- us-phoenix-1: https://loganalytics.us-phoenix-1.oci.oraclecloud.com
- eu-frankfurt-1: https://loganalytics.eu-frankfurt-1.oci.oraclecloud.com
```

Full region list: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm

### Primary API Endpoints

#### 1. Query Execution

**POST** `/20200601/namespaces/{namespaceName}/actions/query`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/QueryDetails/Query

**Purpose**: Execute OCI Logging Analytics query

**Used By**:
- `execute_logan_query`
- `search_security_events`
- `get_mitre_techniques`
- `list_log_sources`
- All query-based tools

**Request Body**:
```json
{
  "compartmentId": "ocid1.compartment.oc1...",
  "queryString": "* | stats count by 'Log Source'",
  "scopeFilters": [],
  "timeFilter": {
    "timeStart": "2025-10-23T00:00:00.000Z",
    "timeEnd": "2025-10-24T00:00:00.000Z"
  },
  "maxTotalCount": 1000
}
```

**Response**:
```json
{
  "results": [...],
  "fieldsMetadata": [...],
  "totalCount": 123
}
```

---

#### 2. Get Namespace

**GET** `/20200601/namespaces/{namespaceName}`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/Namespace/GetNamespace

**Purpose**: Get namespace information

**Used By**: `get_namespace_info`

**Response**:
```json
{
  "namespaceName": "your-namespace",
  "compartmentId": "ocid1.compartment.oc1...",
  "isOnboarded": true
}
```

---

#### 3. List Fields

**GET** `/20200601/namespaces/{namespaceName}/fields`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsFieldCollection/ListFields

**Purpose**: List available log fields

**Used By**: `list_log_fields`, `get_field_details`

**Query Parameters**:
- `compartmentId` (required)
- `isShowDetail` (optional, boolean)
- `limit` (optional, default 50, max 1000)
- `page` (optional, for pagination)

**Response**:
```json
{
  "items": [
    {
      "name": "Log Source",
      "dataType": "STRING",
      "isMultiValued": false,
      "description": "Source of the log entry"
    }
  ]
}
```

---

#### 4. List Parsers

**GET** `/20200601/namespaces/{namespaceName}/parsers`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsParserCollection/ListParsers

**Purpose**: List available log parsers

**Used By**: `list_parsers`

**Query Parameters**:
- `compartmentId` (required)
- `isSystem` (optional, boolean)
- `parserType` (optional: REGEX, XML, JSON, DELIMITED)

**Response**:
```json
{
  "items": [
    {
      "name": "Apache Combined Log Format",
      "type": "REGEX",
      "isSystem": true
    }
  ]
}
```

---

#### 5. List Log Groups

**GET** `/20200601/namespaces/{namespaceName}/logAnalyticsLogGroups`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsLogGroupCollection/ListLogAnalyticsLogGroups

**Purpose**: List log groups in compartment

**Query Parameters**:
- `compartmentId` (required)
- `displayName` (optional)
- `limit` (optional)

---

#### 6. List Entities

**GET** `/20200601/namespaces/{namespaceName}/logAnalyticsEntities`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsEntityCollection/ListLogAnalyticsEntities

**Purpose**: List entities (hosts, databases, etc.)

**Used By**: `list_entities`

**Query Parameters**:
- `compartmentId` (required)
- `entityType` (optional: HOST, DATABASE, APPLICATION)
- `limit` (optional)

**Response**:
```json
{
  "items": [
    {
      "name": "web-server-01",
      "entityType": "HOST",
      "managementAgentId": "ocid1.managementagent.oc1..."
    }
  ]
}
```

---

#### 7. Get Storage Usage

**GET** `/20200601/namespaces/{namespaceName}/storage/usage`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/Storage/GetStorage

**Purpose**: Get storage usage statistics

**Used By**: `get_storage_usage`

**Response**:
```json
{
  "usedGB": 123.45,
  "allocatedGB": 500.0
}
```

---

#### 8. List Labels

**GET** `/20200601/namespaces/{namespaceName}/labels`

Official Docs: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsLabelCollection/ListLabels

**Purpose**: List available labels

**Used By**: `list_labels`

---

## Authentication

### Authentication Methods

The MCP server supports all standard OCI authentication methods:

#### 1. Config File Authentication (Recommended)

**Location**: `~/.oci/config`

**Format**:
```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaa...
fingerprint=aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99
tenancy=ocid1.tenancy.oc1..aaaaaaaa...
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

**Official Guide**: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm

**Python SDK Config**:
```python
from oci.config import from_file

config = from_file("~/.oci/config", "DEFAULT")
```

---

#### 2. Environment Variables

**Variables**:
```bash
export OCI_CLI_USER=ocid1.user.oc1..aaaaaaaa...
export OCI_CLI_FINGERPRINT=aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99
export OCI_CLI_TENANCY=ocid1.tenancy.oc1..aaaaaaaa...
export OCI_CLI_REGION=us-ashburn-1
export OCI_CLI_KEY_FILE=~/.oci/oci_api_key.pem
```

---

#### 3. Instance Principal

**Use Case**: Running on OCI Compute Instance

**Python SDK**:
```python
from oci.auth.signers import InstancePrincipalsSecurityTokenSigner

signer = InstancePrincipalsSecurityTokenSigner()
client = LogAnalyticsClient(config={}, signer=signer)
```

**Official Guide**: https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm

---

#### 4. Resource Principal

**Use Case**: Running as OCI Function or Container

**Python SDK**:
```python
from oci.auth.signers import get_resource_principals_signer

signer = get_resource_principals_signer()
client = LogAnalyticsClient(config={}, signer=signer)
```

**Official Guide**: https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionsaccessingociresources.htm

---

### API Key Setup

**Generate API Key**:
```bash
# Generate RSA key pair
openssl genrsa -out ~/.oci/oci_api_key.pem 2048

# Generate public key
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem

# Get fingerprint
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c

# Set permissions
chmod 600 ~/.oci/oci_api_key.pem
```

**Upload Public Key**:
1. Go to OCI Console → Identity → Users → Your User
2. Click **API Keys**
3. Click **Add API Key**
4. Upload `oci_api_key_public.pem`

**Official Guide**: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm

---

## Request/Response Format

### Request Headers

All API requests include:

```
Authorization: Signature version="1",
  keyId="<tenancy_ocid>/<user_ocid>/<key_fingerprint>",
  algorithm="rsa-sha256",
  headers="date (request-target) host",
  signature="<computed_signature>"
Date: Thu, 24 Oct 2025 12:00:00 GMT
Content-Type: application/json
Accept: application/json
```

**Signing Details**: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm

---

### Query Request Format

**Complete Query Request**:

```json
{
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa",
  "compartmentIdInSubtree": false,
  "queryString": "'Log Source' = 'Linux Syslog Logs' | stats count",
  "subSystem": "LOG",
  "scopeFilters": [
    {
      "filterType": "LOG_GROUP_ID",
      "filterValue": "ocid1.loganalyticsloggroup.oc1..."
    }
  ],
  "maxTotalCount": 1000,
  "timeFilter": {
    "timeStart": "2025-10-23T00:00:00.000Z",
    "timeEnd": "2025-10-24T00:00:00.000Z",
    "timeZone": "UTC"
  },
  "queryTimeoutInSeconds": 120
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `compartmentId` | string | Yes | Compartment OCID |
| `queryString` | string | Yes | OCI query language query |
| `timeFilter` | object | Yes | Time range filter |
| `maxTotalCount` | integer | No | Max results (default 1000) |
| `queryTimeoutInSeconds` | integer | No | Timeout (default 120) |
| `scopeFilters` | array | No | Additional filters |

---

### Query Response Format

**Success Response**:

```json
{
  "results": [
    {
      "Log Source": "Linux Syslog Logs",
      "count": 12534
    },
    {
      "Log Source": "OCI VCN Flow Logs",
      "count": 8765
    }
  ],
  "fieldsMetadata": [
    {
      "name": "Log Source",
      "dataType": "STRING"
    },
    {
      "name": "count",
      "dataType": "LONG"
    }
  ],
  "totalCount": 2,
  "percentComplete": 100,
  "arePartialResults": false,
  "columns": [
    {
      "name": "Log Source",
      "displayName": "Log Source",
      "type": "CLASSIFY_COLUMN"
    },
    {
      "name": "count",
      "displayName": "count",
      "type": "COLUMN"
    }
  ]
}
```

---

### Error Response Format

**Error Response**:

```json
{
  "code": "NotAuthenticated",
  "message": "The required information to complete authentication was not provided or was incorrect.",
  "status": 401
}
```

**Common HTTP Status Codes**:

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check query syntax |
| 401 | Not Authenticated | Check credentials |
| 403 | Not Authorized | Check IAM policies |
| 404 | Not Found | Check compartment ID |
| 429 | Too Many Requests | Implement backoff |
| 500 | Internal Server Error | Retry request |

---

## Rate Limits

### API Rate Limits

**Default Limits** (per tenant):

| Operation | Limit | Time Window |
|-----------|-------|-------------|
| Query Execution | 10 queries/second | 1 second |
| Data Ingestion | 1000 requests/second | 1 second |
| Metadata Operations | 50 requests/second | 1 second |

**Official Documentation**: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/servicelimits.htm

---

### Query Limits

**Query Execution Limits**:

| Parameter | Default | Maximum |
|-----------|---------|---------|
| Query Timeout | 120 seconds | 600 seconds |
| Max Results | 1000 | 10000 |
| Time Range | No limit | 90 days recommended |
| Concurrent Queries | 5 | 10 |

---

### Handling Rate Limits

**Python SDK with Retry**:

```python
from oci.retry import DEFAULT_RETRY_STRATEGY

client = LogAnalyticsClient(
    config=config,
    retry_strategy=DEFAULT_RETRY_STRATEGY
)
```

**Exponential Backoff**:

```python
import time

def execute_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except ServiceError as e:
            if e.status == 429:  # Too Many Requests
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                raise
    raise Exception("Max retries exceeded")
```

---

## API Operations by Tool

### Query Execution Tools

#### execute_logan_query
**API**: `POST /namespaces/{ns}/actions/query`
**Python SDK**: `client.query(namespace_name, query_details)`
**Docs**: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/QueryDetails/Query

#### search_security_events
**API**: `POST /namespaces/{ns}/actions/query`
**Additional**: Query transformation in TypeScript layer
**Docs**: Same as execute_logan_query

#### get_mitre_techniques
**API**: `POST /namespaces/{ns}/actions/query`
**Query**: `'Technique_id' is not null | stats count by 'Technique_id', 'Tactic'`
**Docs**: Same as execute_logan_query

#### analyze_ip_activity
**API**: `POST /namespaces/{ns}/actions/query`
**Query**: Multiple queries for source/destination analysis
**Docs**: Same as execute_logan_query

---

### Resource Management Tools

#### list_log_sources
**API**: `POST /namespaces/{ns}/actions/query`
**Query**: `* | stats count by 'Log Source' | sort count desc`
**Fixed in v1.3.0**: Now uses `execute_query_like_console()`

#### list_log_fields
**API**: `GET /namespaces/{ns}/fields`
**Python SDK**: `client.list_fields(namespace_name, compartment_id)`
**Docs**: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsFieldCollection/ListFields

#### list_entities
**API**: `GET /namespaces/{ns}/logAnalyticsEntities`
**Python SDK**: `client.list_log_analytics_entities(namespace_name, compartment_id)`
**Docs**: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsEntityCollection/ListLogAnalyticsEntities

#### get_namespace_info
**API**: `GET /namespaces/{ns}`
**Python SDK**: `client.get_namespace(namespace_name)`
**Docs**: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/Namespace/GetNamespace

#### list_parsers
**API**: `GET /namespaces/{ns}/parsers`
**Python SDK**: `client.list_parsers(namespace_name, compartment_id)`
**Docs**: https://docs.oracle.com/en-us/iaas/api/#/en/logan-api-spec/20200601/LogAnalyticsParserCollection/ListParsers

---

## Common Parameters

### Compartment ID

**Format**: `ocid1.compartment.oc1..aaaaaaaa[unique-id]`
**Required**: Yes (for most operations)
**How to Find**:
```bash
oci iam compartment list --all
```

---

### Namespace Name

**Format**: Usually your tenancy name
**Required**: Yes (in URL path)
**How to Find**:
```bash
oci log-analytics namespace list --compartment-id <compartment-ocid>
```

---

### Time Filter

**Format**:
```json
{
  "timeStart": "2025-10-23T00:00:00.000Z",
  "timeEnd": "2025-10-24T00:00:00.000Z",
  "timeZone": "UTC"
}
```

**Timezone**: Always use UTC for consistency

---

### Scope Filters

**Types**:
- `LOG_GROUP_ID` - Filter by log group
- `ENTITY_ID` - Filter by entity
- `LOG_SOURCE` - Filter by log source

**Example**:
```json
{
  "scopeFilters": [
    {
      "filterType": "LOG_GROUP_ID",
      "filterValue": "ocid1.loganalyticsloggroup.oc1..."
    }
  ]
}
```

---

## Error Codes

### Common Error Codes

| Code | HTTP Status | Cause | Solution |
|------|-------------|-------|----------|
| `NotAuthenticated` | 401 | Invalid credentials | Check API key and config |
| `NotAuthorizedOrNotFound` | 404 | No permission or resource doesn't exist | Check IAM policies and compartment ID |
| `InvalidParameter` | 400 | Invalid parameter value | Check parameter format |
| `LimitExceeded` | 400 | Query too large | Reduce time range or add filters |
| `TooManyRequests` | 429 | Rate limit exceeded | Implement exponential backoff |
| `InternalServerError` | 500 | OCI service error | Retry request |
| `ServiceUnavailable` | 503 | Service temporarily unavailable | Retry after delay |

**Official Error Codes**: https://docs.oracle.com/en-us/iaas/Content/API/References/apierrors.htm

---

### Query-Specific Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Missing input at 'time'` | Field name capitalization | Use `Time` not `time` |
| `extraneous input` | Syntax error | Check query syntax |
| `Query timeout` | Query too slow | Optimize query or increase timeout |
| `No data found` | Empty result set | Check time range and filters |

---

## Best Practices

### 1. Query Optimization

**DO**:
- ✅ Use specific log sources: `'Log Source' = 'Linux Syslog Logs'`
- ✅ Add time filters early in query
- ✅ Use `head` to limit results: `| head 100`
- ✅ Filter before aggregating: Filter → Stats → Sort
- ✅ Use appropriate time ranges (24h for exploration, 7d+ for trends)

**DON'T**:
- ❌ Use `*` without filters for large datasets
- ❌ Request 90+ days of data without aggregation
- ❌ Use complex regex on large datasets
- ❌ Omit time filters (causes full table scan)

**Official Guide**: https://docs.oracle.com/en-us/iaas/logging-analytics/doc/optimize-queries.html

---

### 2. Authentication

**DO**:
- ✅ Use config file authentication
- ✅ Protect private keys (chmod 600)
- ✅ Rotate API keys regularly
- ✅ Use instance/resource principals when possible
- ✅ Store credentials securely (never in code)

**DON'T**:
- ❌ Commit credentials to Git
- ❌ Share private keys
- ❌ Use root account credentials
- ❌ Store keys in environment variables long-term

---

### 3. Rate Limit Handling

**DO**:
- ✅ Implement exponential backoff
- ✅ Use SDK retry strategies
- ✅ Batch requests when possible
- ✅ Cache frequently accessed data
- ✅ Monitor rate limit headers

**DON'T**:
- ❌ Ignore 429 errors
- ❌ Retry immediately on failure
- ❌ Run queries in tight loops
- ❌ Make concurrent requests without throttling

---

### 4. Error Handling

**DO**:
- ✅ Check HTTP status codes
- ✅ Log error details for debugging
- ✅ Implement proper retry logic
- ✅ Validate inputs before API calls
- ✅ Provide user-friendly error messages

**DON'T**:
- ❌ Ignore errors silently
- ❌ Expose sensitive error details to users
- ❌ Retry on 4xx errors (except 429)
- ❌ Make assumptions about error formats

---

### 5. Performance

**DO**:
- ✅ Use pagination for large result sets
- ✅ Implement result caching
- ✅ Execute queries in parallel when independent
- ✅ Use streaming for large responses
- ✅ Monitor query performance

**DON'T**:
- ❌ Fetch all data at once
- ❌ Run synchronous queries sequentially
- ❌ Hold large result sets in memory
- ❌ Make redundant API calls

---

## Python SDK Code Examples

### Basic Query Execution

```python
from oci.config import from_file
from oci.log_analytics import LogAnalyticsClient
from oci.log_analytics.models import QueryDetails
from datetime import datetime, timedelta, timezone

# Load configuration
config = from_file("~/.oci/config")

# Create client
client = LogAnalyticsClient(config)

# Define query
query_details = QueryDetails(
    compartment_id="ocid1.compartment.oc1...",
    query_string="'Log Source' = 'Linux Syslog Logs' | stats count",
    sub_system="LOG",
    time_filter={
        "time_start": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(),
        "time_end": datetime.now(timezone.utc).isoformat(),
        "time_zone": "UTC"
    },
    max_total_count=1000
)

# Execute query
response = client.query(
    namespace_name="your-namespace",
    query_details=query_details
)

# Process results
for result in response.data.results:
    print(result)
```

---

### List Fields

```python
# List all fields
response = client.list_fields(
    namespace_name="your-namespace",
    compartment_id="ocid1.compartment.oc1...",
    is_show_detail=True,
    limit=100
)

for field in response.data.items:
    print(f"{field.name}: {field.data_type}")
```

---

### List Entities

```python
# List entities
response = client.list_log_analytics_entities(
    namespace_name="your-namespace",
    compartment_id="ocid1.compartment.oc1...",
    entity_type="HOST",
    limit=50
)

for entity in response.data.items:
    print(f"{entity.name} ({entity.entity_type})")
```

---

### With Retry Strategy

```python
from oci.retry import DEFAULT_RETRY_STRATEGY

client = LogAnalyticsClient(
    config=config,
    retry_strategy=DEFAULT_RETRY_STRATEGY
)

# All client operations will now automatically retry
response = client.query(namespace_name, query_details)
```

---

## Additional Resources

### Official Oracle Resources

- **OCI Logging Analytics Home**: https://www.oracle.com/cloud/logging-analytics/
- **Product Page**: https://www.oracle.com/manageability/logging-analytics/
- **Blogs**: https://blogs.oracle.com/observability/
- **YouTube Channel**: https://www.youtube.com/user/Oracle

### Developer Resources

- **OCI GitHub**: https://github.com/oracle/oci-python-sdk
- **Code Samples**: https://github.com/oracle-quickstart/oci-arch-logging-analytics
- **Forums**: https://community.oracle.com/mosc/categories/oci-observability-and-management

### Learning Resources

- **OCI Training**: https://mylearn.oracle.com/
- **Hands-on Labs**: https://apexapps.oracle.com/pls/apex/f?p=44785:
- **OCI Workshops**: https://oracle.github.io/learning-library/

---

## Support

### Getting Help with OCI APIs

- **OCI Documentation**: https://docs.oracle.com/en-us/iaas/Content/home.htm
- **Support Portal**: https://support.oracle.com/
- **Community Forums**: https://community.oracle.com/
- **Stack Overflow**: Tag with `oracle-cloud-infrastructure`

### MCP Server Issues

- **GitHub Issues**: https://github.com/yourusername/mcp-oci-logan-server/issues
- **Documentation**: [Installation](Installation) | [Troubleshooting](Troubleshooting)
- **Wiki Home**: [Home](Home)

---

**Last Updated**: October 2025
**Version**: 1.3.0

**See Also**:
- [Capabilities](Capabilities) - All MCP tools
- [Troubleshooting](Troubleshooting) - Common API issues
- [Installation](Installation) - Setup guide
