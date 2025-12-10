# Hotel Management System - Network Architecture Diagram

## System Network Architecture

```mermaid
flowchart TB
    subgraph "Client Tier - End Users"
        C1[Customer Portal<br/>Web Browser]
        C2[Hotel Staff Portal<br/>Web Browser]
        C3[Admin Dashboard<br/>Web Browser]
        C4[Mobile Devices<br/>Mobile Browser]
    end

    subgraph "Network Security Layer"
        FW[Firewall & DDoS Protection]
        LB[Load Balancer]
        SSL[SSL/TLS Encryption<br/>HTTPS 443]
    end

    subgraph "Web Tier - Frontend Servers"
        WEB1[Web Server Instance 1<br/>React Application]
        WEB2[Web Server Instance 2<br/>React Application]
        
        subgraph "Frontend Components"
            UI[User Interface Components]
            ROUTER[Application Router]
            API_CLIENT[API Client Layer]
        end
    end

    subgraph "Application Tier - Backend Servers"
        APP1[Application Server 1<br/>Node.js + Express]
        APP2[Application Server 2<br/>Node.js + Express]
        
        subgraph "API Gateway"
            AUTH[Authentication Service<br/>/api/auth]
            BOOKING[Booking Service<br/>/api/bookings]
            PAYMENT[Payment Service<br/>/api/payment]
            BILLING[Billing Service<br/>/api/billings]
            ROOM[Room Management<br/>/api/rooms]
            CUSTOMER[Customer Service<br/>/api/customer-bills]
        end
        
        subgraph "Background Services"
            CRON1[Booking Expiration Monitor]
            CRON2[Payment Status Sync]
        end
    end

    subgraph "Data Tier - Database Cluster"
        DB_PRIMARY[(Primary Database<br/>MongoDB)]
        DB_REPLICA[(Replica Database<br/>MongoDB)]
        
        subgraph "Data Collections"
            USERS[Users]
            ROOMS[Rooms]
            BOOKINGS[Bookings]
            BILLS[Billings]
            REVIEWS[Reviews]
        end
    end

    subgraph "External Service Integration"
        PAYMONGO[PayMongo<br/>Payment Gateway]
        EMAIL[Email Service<br/>SMTP Server]
        QR[QR Code Service]
    end

    %% Client to Security Layer
    C1 & C2 & C3 & C4 -->|HTTPS Request| FW
    
    %% Security Layer Flow
    FW --> LB
    LB --> SSL
    
    %% Frontend Distribution
    SSL -->|Encrypted Traffic| WEB1 & WEB2
    WEB1 & WEB2 --> UI
    UI --> ROUTER
    ROUTER --> API_CLIENT
    
    %% Frontend to Backend
    API_CLIENT -->|REST API Calls| APP1 & APP2
    
    %% Backend API Processing
    APP1 & APP2 --> AUTH & BOOKING & PAYMENT & BILLING & ROOM & CUSTOMER
    
    %% Backend to Database
    AUTH & BOOKING & PAYMENT & BILLING & ROOM & CUSTOMER --> DB_PRIMARY
    
    %% Database Replication
    DB_PRIMARY -.->|Real-time Replication| DB_REPLICA
    
    %% Database Collections
    DB_PRIMARY --> USERS & ROOMS & BOOKINGS & BILLS & REVIEWS
    
    %% Background Services
    APP1 & APP2 --> CRON1 & CRON2
    CRON1 & CRON2 --> DB_PRIMARY
    
    %% External Services
    PAYMENT -->|API Integration| PAYMONGO
    PAYMONGO -->|Webhook Callbacks| PAYMENT
    AUTH -->|Send Emails| EMAIL
    PAYMENT -->|Generate QR| QR

    classDef clientStyle fill:#4FC3F7,stroke:#01579B,stroke-width:3px,color:#000
    classDef securityStyle fill:#FFD54F,stroke:#F57F17,stroke-width:3px,color:#000
    classDef frontendStyle fill:#BA68C8,stroke:#4A148C,stroke-width:3px,color:#fff
    classDef backendStyle fill:#81C784,stroke:#1B5E20,stroke-width:3px,color:#000
    classDef dataStyle fill:#FF8A65,stroke:#BF360C,stroke-width:3px,color:#000
    classDef externalStyle fill:#FFB74D,stroke:#E65100,stroke-width:3px,color:#000

    class C1,C2,C3,C4 clientStyle
    class FW,LB,SSL securityStyle
    class WEB1,WEB2,UI,ROUTER,API_CLIENT frontendStyle
    class APP1,APP2,AUTH,BOOKING,PAYMENT,BILLING,ROOM,CUSTOMER,CRON1,CRON2 backendStyle
    class DB_PRIMARY,DB_REPLICA,USERS,ROOMS,BOOKINGS,BILLS,REVIEWS dataStyle
    class PAYMONGO,EMAIL,QR externalStyle
```

---

## Network Topology

```mermaid
graph TB
    subgraph INTERNET["Public Internet"]
        USERS[End Users<br/>Customers & Staff]
    end

    subgraph DMZ["DMZ - Demilitarized Zone"]
        FIREWALL[Next-Gen Firewall<br/>Port 443 HTTPS]
        BALANCER[Load Balancer<br/>Traffic Distribution]
    end

    subgraph APP_ZONE["Application Zone"]
        WS1[Web Server 1<br/>Frontend Application]
        WS2[Web Server 2<br/>Frontend Application]
        AS1[App Server 1<br/>Backend API]
        AS2[App Server 2<br/>Backend API]
    end

    subgraph DATA_ZONE["Data Zone - Private Network"]
        PRIMARY[(MongoDB Primary<br/>Master Database)]
        SECONDARY[(MongoDB Secondary<br/>Replica Set)]
    end

    subgraph EXTERNAL["External Services"]
        GATEWAY[Payment Gateway<br/>PayMongo API]
        SMTP[Email Server<br/>SMTP/TLS]
    end

    USERS -->|Port 443| FIREWALL
    FIREWALL --> BALANCER
    BALANCER -->|Round Robin| WS1 & WS2
    WS1 & WS2 -->|API Calls| AS1 & AS2
    AS1 & AS2 -->|MongoDB Protocol| PRIMARY
    PRIMARY -.->|Replication| SECONDARY
    AS1 & AS2 -->|HTTPS API| GATEWAY
    AS1 & AS2 -->|Port 587| SMTP
    GATEWAY -.->|Webhooks| AS1 & AS2

    classDef publicStyle fill:#ef5350,stroke:#b71c1c,stroke-width:4px,color:#fff
    classDef dmzStyle fill:#ffca28,stroke:#f57f17,stroke-width:4px,color:#000
    classDef appStyle fill:#66bb6a,stroke:#2e7d32,stroke-width:3px,color:#000
    classDef dataStyle fill:#ab47bc,stroke:#6a1b9a,stroke-width:3px,color:#fff
    classDef extStyle fill:#42a5f5,stroke:#01579b,stroke-width:3px,color:#000

    class USERS publicStyle
    class FIREWALL,BALANCER dmzStyle
    class WS1,WS2,AS1,AS2 appStyle
    class PRIMARY,SECONDARY dataStyle
    class GATEWAY,SMTP extStyle
```

---

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as End User
    participant Web as Web Server
    participant API as API Server
    participant DB as Database
    participant Pay as Payment Gateway
    participant Mail as Email Service

    User->>Web: Access Hotel Website
    Web->>User: Render UI
    
    User->>Web: Search Available Rooms
    Web->>API: GET /api/rooms
    API->>DB: Query Available Rooms
    DB->>API: Return Room Data
    API->>Web: JSON Response
    Web->>User: Display Rooms
    
    User->>Web: Create Booking
    Web->>API: POST /api/bookings
    API->>DB: Validate & Create Booking
    DB->>API: Booking Confirmed
    API->>Web: Booking Details
    
    Web->>API: Initiate Payment
    API->>Pay: Create Payment Link
    Pay->>API: Payment URL
    API->>Web: Return Payment Link
    Web->>User: Redirect to Payment
    
    User->>Pay: Complete Payment
    Pay->>API: Webhook Notification
    API->>DB: Update Payment Status
    API->>Mail: Send Confirmation Email
    Mail->>User: Email Receipt
    
    API->>Web: Update Booking Status
    Web->>User: Show Confirmation
```

---

## Security Architecture

```mermaid
flowchart LR
    subgraph "External Access"
        CLIENT[Client Browser]
    end

    subgraph "Security Layers"
        LAYER1[Layer 1: Firewall<br/>DDoS Protection]
        LAYER2[Layer 2: SSL/TLS<br/>Certificate Validation]
        LAYER3[Layer 3: CORS Policy<br/>Origin Validation]
        LAYER4[Layer 4: JWT Auth<br/>Token Verification]
        LAYER5[Layer 5: Input Validation<br/>Data Sanitization]
    end

    subgraph "Protected Resources"
        APP[Application Server]
        DATA[(Secure Database)]
    end

    CLIENT -->|HTTPS Request| LAYER1
    LAYER1 --> LAYER2
    LAYER2 --> LAYER3
    LAYER3 --> LAYER4
    LAYER4 --> LAYER5
    LAYER5 --> APP
    APP --> DATA

    classDef security fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff
    classDef protected fill:#51cf66,stroke:#2b8a3e,stroke-width:2px,color:#000

    class LAYER1,LAYER2,LAYER3,LAYER4,LAYER5 security
    class APP,DATA protected
```

---

## Deployment Infrastructure

```mermaid
graph TB
    subgraph CLOUD["Cloud Infrastructure - Render.com"]
        subgraph FRONTEND["Frontend Service"]
            FE1[React App Instance 1]
            FE2[React App Instance 2]
            CDN[CDN Cache Layer]
        end

        subgraph BACKEND["Backend Service"]
            BE1[Express Server 1]
            BE2[Express Server 2]
            ENV[Environment Variables<br/>Secure Vault]
        end

        subgraph DATABASE["Database Service"]
            ATLAS[(MongoDB Atlas<br/>Cloud Database)]
            BACKUP[(Automated Backups)]
        end
    end

    subgraph EXTERNAL_SVC["External Services"]
        PMG[PayMongo Gateway]
        MAIL_SVC[Email SMTP Service]
    end

    CDN --> FE1 & FE2
    FE1 & FE2 --> BE1 & BE2
    BE1 & BE2 --> ENV
    BE1 & BE2 --> ATLAS
    ATLAS -.-> BACKUP
    BE1 & BE2 --> PMG
    BE1 & BE2 --> MAIL_SVC

    classDef frontend fill:#667eea,stroke:#4c51bf,stroke-width:2px,color:#fff
    classDef backend fill:#48bb78,stroke:#2f855a,stroke-width:2px,color:#fff
    classDef database fill:#f6ad55,stroke:#c05621,stroke-width:2px,color:#000
    classDef external fill:#fc8181,stroke:#c53030,stroke-width:2px,color:#fff

    class FE1,FE2,CDN frontend
    class BE1,BE2,ENV backend
    class ATLAS,BACKUP database
    class PMG,MAIL_SVC external
```

---

## System Components Overview

### **Client Tier**
- Customer Portal (Room Booking Interface)
- Staff Portal (Task & Request Management)
- Admin Dashboard (System Management & Analytics)
- Mobile-Responsive Design

### **Network Security**
- Next-Generation Firewall
- DDoS Protection & Rate Limiting
- SSL/TLS Certificate (256-bit Encryption)
- Load Balancer (Traffic Distribution)

### **Frontend Tier**
- **Technology**: React 18+ with Vite
- **Features**: Single Page Application (SPA)
- **Deployment**: Multiple Server Instances
- **Caching**: CDN Integration

### **Backend Tier**
- **Technology**: Node.js + Express.js
- **Architecture**: RESTful API
- **Authentication**: JWT-based Security
- **Services**: Microservices-ready Design

### **Database Tier**
- **Database**: MongoDB (NoSQL)
- **Configuration**: Replica Set
- **Backup**: Automated Daily Backups
- **Security**: Encrypted Connections

### **External Integration**
- **Payment Gateway**: PayMongo (Philippine Peso)
- **Email Service**: SMTP with TLS
- **QR Code Generation**: Payment QR Codes

---

## Network Specifications

| Component | Protocol | Port | Security |
|-----------|----------|------|----------|
| Client Access | HTTPS | 443 | SSL/TLS Encrypted |
| API Communication | HTTPS | 443 | JWT Authentication |
| Database Connection | MongoDB Protocol | 27017 | Auth + Encryption |
| Email Service | SMTP/TLS | 587 | TLS Encrypted |
| Payment Webhooks | HTTPS | 443 | Signature Verification |

---

## Key Features

✅ **High Availability**: Load-balanced multi-instance deployment  
✅ **Security**: Multi-layer security architecture  
✅ **Scalability**: Horizontal scaling capability  
✅ **Reliability**: Database replication & automated backups  
✅ **Performance**: CDN caching & optimized queries  
✅ **Integration**: Third-party payment & email services  

---

**Project**: Hotel Management System  
**Architecture**: Three-Tier Web Application  
**Deployment**: Cloud-Based Infrastructure  
**Security Level**: Enterprise-Grade
