# OCI Log Analytics MCP Server Enhancements

## Overview

This document outlines the comprehensive enhancements made to the OCI Logan MCP Server based on the official Oracle Cloud Infrastructure Log Analytics documentation. The updates include new advanced capabilities, enhanced query language support, and extensive new query examples.

## Enhanced Capabilities

### 1. Advanced Analytics Tools

#### `execute_advanced_analytics`
- **Cluster Analysis**: Group similar log records using machine learning clustering
- **Link Analysis**: Connect related events across different log sources
- **NLP Processing**: Apply natural language processing to log messages
- **Classification**: Automatically classify log events
- **Outlier Detection**: Identify anomalous events and patterns
- **Sequence Analysis**: Detect patterns in event sequences
- **Geographic Statistics**: Analyze events by geographic coordinates
- **Time-based Clustering**: Cluster events based on temporal patterns

#### `execute_statistical_analysis`
- **Stats**: Basic statistical aggregations (count, sum, avg, min, max, stdev, var)
- **Timestats**: Time-series statistical analysis with customizable intervals
- **Eventstats**: Overall summary statistics across the dataset
- **Top/Bottom**: Find highest/lowest values
- **Frequent/Rare**: Identify most/least common values
- **Percentile Analysis**: Calculate statistical percentiles

#### `execute_field_operations`
- **Extract**: Use regex patterns to extract fields from log messages
- **Eval**: Calculate expressions and create new fields
- **Addfields**: Add computed fields to results
- **Rename**: Change field names dynamically
- **Fields**: Include or exclude specific fields
- **Dedup**: Remove duplicate records
- **Bucket**: Group numeric values into ranges

#### `search_log_patterns`
- **Pattern Types**: Support for wildcard, regex, exact, and contains matching
- **Advanced Filtering**: Filter by severity, hosts, IP addresses
- **Exclude Patterns**: Capability to exclude unwanted patterns
- **Multi-field Search**: Search across specific fields or all fields

#### `correlation_analysis`
- **Temporal Correlation**: Link events based on time windows
- **Entity-based Correlation**: Correlate events by common entities (users, IPs, etc.)
- **Transaction Linking**: Connect events into business transactions
- **Sequence Analysis**: Identify ordered sequences of events
- **Multi-source Correlation**: Correlate across different log sources

### 2. Enhanced Query Language Support

#### Time Filtering Enhancements
- Extended time range support (now includes 90d)
- Custom time filter support using `dateRelative()` and `toDate()` functions
- Automatic time filter injection for queries missing time constraints

#### Query Language Features
- Pipe-delimited command structure support
- Boolean operators: AND, OR, NOT IN, LIKE, NOT LIKE
- Comparison operators: <, <=, >, >=, =, !=
- Wildcard support: ? (single character), * and % (multiple characters)
- Field quoting with single and double quotes
- Case-insensitive field matching

## New Query Examples

### Security Analytics
1. **Security Alerts Pattern Analysis**: Cluster security alerts to identify patterns
2. **Anomalous User Activity Detection**: Use outlier analysis to detect unusual user behavior
3. **Attack Sequence Detection**: Identify coordinated attack sequences

### Network Analytics
1. **Geographic Network Traffic Analysis**: Analyze traffic patterns by location using geostats
2. **Network Communication Correlation**: Link network communications using transaction flows
3. **Top Network Talkers**: Identify bandwidth consumers using statistical analysis
4. **Network Protocol Usage Trends**: Analyze protocol usage over time

### Authentication Analytics
1. **Authentication Time Pattern Analysis**: Analyze login patterns by time of day
2. **Failed Authentication Pattern Clustering**: Cluster failed attempts to identify attacks
3. **Authentication Success Rate Analysis**: Calculate success rates with advanced field operations

### Advanced Analytics Examples
1. **Natural Language Processing**: Apply NLP to analyze log message sentiment
2. **Temporal Event Clustering**: Cluster events based on time patterns
3. **Dynamic Field Extraction**: Extract custom fields using regex patterns
4. **Response Time Bucket Analysis**: Analyze performance using bucketing
5. **Unique Events Analysis**: Remove duplicates for clean analysis

### Statistical Analysis Examples
1. **Error Frequency Statistical Analysis**: Z-score analysis of error patterns
2. **User Activity Statistical Summary**: Comprehensive user behavior statistics
3. **Resource Usage Percentile Analysis**: Performance percentile calculations
4. **Frequent and Rare Events Analysis**: Event frequency classification

### Compliance Monitoring Examples
1. **Audit Trail Compliance Check**: Monitor audit trails for compliance
2. **Privileged Access Monitoring**: Risk scoring for privileged access
3. **Sensitive Data Access Patterns**: Link analysis for data access patterns

## Query Structure Examples

### Basic Query Structure
```
'Log Source' = 'Windows Sysmon Events' and Time > dateRelative(24h) | stats count by 'Event Name'
```

### Advanced Analytics Query
```
Severity = 'error' and Time > dateRelative(24h) | cluster maxclusters=10 t=0.8 field='Alert Type', 'Source IP'
```

### Statistical Analysis Query
```
'Response Time' is not null and Time > dateRelative(24h) | stats perc95('Response Time') as p95, avg('Response Time') as avg_time by 'Service Name'
```

### Field Operations Query
```
'Log Message' contains 'user=' and Time > dateRelative(24h) | extract 'user=(?<extracted_user>[^\\s]+)' | stats count by extracted_user
```

### Correlation Analysis Query
```
'Log Source' = 'Security Events' and Time > dateRelative(24h) | link 'User Name', 'IP Address' maxspan=5m
```

## Implementation Details

### Tool Categories Enhanced
- **Security**: Traditional security monitoring with advanced analytics
- **Network**: Network analysis with geographic and pattern capabilities
- **Authentication**: Authentication monitoring with statistical analysis
- **Advanced Analytics**: Machine learning and AI-powered analysis
- **Statistical Analysis**: Mathematical and statistical operations
- **Compliance Monitoring**: Regulatory compliance and audit support

### Command Support
- **Aggregation Commands**: stats, timestats, eventstats, geostats
- **Analytics Commands**: cluster, link, nlp, classify, outlier, sequence, timecluster
- **Field Commands**: extract, eval, addfields, rename, fields, dedup, bucket
- **Display Commands**: top, bottom, frequent, rare, head, tail, sort

### Error Handling
- Comprehensive error handling for all new tools
- Validation of query syntax and parameters
- Graceful fallback for unsupported operations
- Detailed error messages with context

## Benefits

1. **Enhanced Security Analysis**: Advanced pattern detection and anomaly identification
2. **Improved Performance Monitoring**: Statistical analysis and trending capabilities
3. **Better Compliance Support**: Automated compliance monitoring and reporting
4. **Advanced Correlation**: Multi-dimensional event correlation capabilities
5. **Machine Learning Integration**: NLP and clustering for intelligent analysis
6. **Flexible Query Language**: Full support for OCI Log Analytics query syntax

## Usage Recommendations

1. **Start Simple**: Begin with basic queries and gradually add advanced analytics
2. **Use Time Filters**: Always include appropriate time ranges for performance
3. **Leverage Clustering**: Use clustering for pattern identification in large datasets
4. **Apply Statistical Analysis**: Use statistical tools for baseline establishment
5. **Combine Tools**: Chain multiple tools for comprehensive analysis
6. **Monitor Performance**: Use execution time metrics to optimize queries

This enhancement significantly expands the OCI Logan MCP Server capabilities, bringing it in line with the full feature set available in Oracle Cloud Infrastructure Log Analytics while maintaining ease of use and defensive security focus.