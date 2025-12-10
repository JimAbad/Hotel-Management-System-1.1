# Hotel Management System - Network Diagrams

This document provides a comprehensive overview of the network architecture for the Hotel Management System project.

---

## Diagram 1: System Network Architecture

**File**: `Diagram_1_System_Network_Architecture.png`

**Description**: This diagram illustrates the complete three-tier architecture of the Hotel Management System, showing all major components and their interactions.

### Components Shown:

**Client Tier**:
- Customer Portal (Web Browser)
- Hotel Staff Portal (Web Browser)
- Admin Dashboard (Web Browser)
- Mobile Devices (Mobile Browser)

**Network Security Layer**:
- Firewall & DDoS Protection
- Load Balancer
- SSL/TLS Encryption (HTTPS Port 443)

**Web Tier**:
- Web Server Instance 1 & 2 (React Application)
- User Interface Components
- Application Router
- API Client Layer

**Application Tier**:
- Application Server 1 & 2 (Node.js + Express)
- API Services:
  - Authentication Service
  - Booking Service
  - Payment Service
  - Billing Service
  - Room Management
  - Customer Service
- Background Services:
  - Booking Expiration Monitor
  - Payment Status Sync

**Data Tier**:
- Primary Database (MongoDB)
- Replica Database (MongoDB)
- Data Collections: Users, Rooms, Bookings, Billings, Reviews

**External Services**:
- PayMongo Payment Gateway
- Email Service (SMTP Server)
- QR Code Service

---

## Diagram 2: Network Topology

**File**: `Diagram_2_Network_Topology.png`

**Description**: This diagram shows the network zones and infrastructure layout, illustrating how different components are organized within network security boundaries.

### Network Zones:

**Public Internet**:
- End Users (Customers & Staff)

**DMZ (Demilitarized Zone)**:
- Next-Gen Firewall (Port 443 HTTPS)
- Load Balancer (Traffic Distribution)

**Application Zone**:
- Web Server 1 & 2 (Frontend Application)
- App Server 1 & 2 (Backend API)

**Data Zone (Private Network)**:
- MongoDB Primary (Master Database)
- MongoDB Secondary (Replica Set)
- Database Replication

**External Services**:
- Payment Gateway (PayMongo API)
- Email Server (SMTP/TLS)

### Data Flow:
1. Users connect via Port 443 to the Firewall
2. Traffic is distributed by the Load Balancer
3. Web Servers handle frontend requests
4. App Servers process backend logic
5. Data is stored in the Primary Database
6. Real-time replication to Secondary Database
7. External services integrate via secure APIs

---

## Diagram 3: Data Flow Sequence

**File**: `Diagram_3_Data_Flow_Sequence.png`

**Description**: This sequence diagram demonstrates the complete flow of a typical booking and payment transaction through the system.

### Transaction Flow:

1. **Initial Access**:
   - User accesses hotel website
   - Web server renders UI

2. **Room Search**:
   - User searches for available rooms
   - Web server calls API endpoint (GET /api/rooms)
   - API server queries database
   - Results returned to user

3. **Booking Creation**:
   - User creates a booking
   - Web server sends POST request to API
   - API validates and creates booking in database
   - Booking confirmation returned

4. **Payment Processing**:
   - Payment initiated through API
   - API creates payment link via PayMongo
   - User redirected to payment gateway
   - User completes payment

5. **Confirmation**:
   - PayMongo sends webhook notification
   - API updates payment status in database
   - Email service sends confirmation receipt
   - Web interface updates booking status
   - User receives final confirmation

---

## Diagram 4: Security Architecture

**File**: `Diagram_4_Security_Architecture.png`

**Description**: This diagram illustrates the five-layer security model protecting the system from external threats to the database.

### Security Layers:

**Layer 1 - Firewall**:
- DDoS Protection
- Malicious traffic filtering
- Port management

**Layer 2 - SSL/TLS**:
- Certificate Validation
- 256-bit encryption
- Secure HTTPS communication

**Layer 3 - CORS Policy**:
- Origin Validation
- Whitelist enforcement
- Cross-origin protection

**Layer 4 - JWT Authentication**:
- Token Verification
- User authentication
- Session management

**Layer 5 - Input Validation**:
- Data Sanitization
- SQL injection prevention
- XSS protection

### Protected Resources:
- Application Server (secured by all 5 layers)
- Secure Database (additional access controls)

---

## Diagram 5: Deployment Infrastructure

**File**: `Diagram_5_Deployment_Infrastructure.png`

**Description**: This diagram shows the cloud-based deployment architecture on Render.com with all services and their interconnections.

### Cloud Infrastructure Components:

**Frontend Service**:
- React App Instance 1 & 2
- CDN Cache Layer for fast content delivery
- Static asset optimization

**Backend Service**:
- Express Server 1 & 2
- Environment Variables (Secure Vault)
- API endpoint management

**Database Service**:
- MongoDB Atlas (Cloud Database)
- Automated Backups
- Point-in-time recovery

**External Services**:
- PayMongo Gateway (Payment processing)
- Email SMTP Service (Transactional emails)

### Connections:
- CDN distributes to React instances
- React instances communicate with Express servers
- Express servers access environment variables
- Express servers connect to MongoDB Atlas
- Automated backup system for database
- Secure API calls to external services

---

## Technical Specifications

### Network Protocols:

| Service | Protocol | Port | Security |
|---------|----------|------|----------|
| Client Access | HTTPS | 443 | SSL/TLS Encrypted |
| API Communication | HTTPS | 443 | JWT Authentication |
| Database Connection | MongoDB Protocol | 27017 | Auth + Encryption |
| Email Service | SMTP/TLS | 587 | TLS Encrypted |
| Payment Webhooks | HTTPS | 443 | Signature Verification |

### Technology Stack:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18+ with Vite | User Interface |
| Backend | Node.js + Express 5.1.0 | API Server |
| Database | MongoDB | Data Persistence |
| Hosting | Render.com | Cloud Deployment |
| CDN | Integrated CDN | Content Delivery |
| Payment | PayMongo | Payment Processing |
| Email | SMTP Service | Notifications |

---

## System Features

### High Availability:
✅ Load-balanced architecture with multiple server instances  
✅ Database replication for failover protection  
✅ CDN caching for improved performance  
✅ Automated health monitoring  

### Security:
✅ Five-layer security architecture  
✅ End-to-end encryption (SSL/TLS)  
✅ JWT-based authentication  
✅ CORS policy enforcement  
✅ Input validation and sanitization  

### Scalability:
✅ Horizontal scaling capability  
✅ Stateless server design  
✅ Database sharding ready  
✅ Microservices-compatible architecture  

### Reliability:
✅ Automated database backups  
✅ Error logging and monitoring  
✅ Payment webhook redundancy  
✅ Session persistence  

---

## Use Cases Supported

1. **Customer Operations**:
   - Browse available rooms
   - Make reservations
   - Process payments
   - View booking history
   - Submit reviews

2. **Staff Operations**:
   - Manage cleaning requests
   - View assigned tasks
   - Update booking status
   - Handle customer requests

3. **Admin Operations**:
   - Full system management
   - Analytics dashboard
   - User management
   - Financial reporting
   - System configuration

---

## Deployment Architecture

### Development Environment:
- Local development servers
- MongoDB local or cloud instance
- Environment-based configuration
- Hot module replacement

### Production Environment:
- Multi-instance deployment on Render.com
- MongoDB Atlas cloud database
- CDN integration for static assets
- Automated CI/CD pipeline
- Environment variable management
- SSL certificate automation

---

## Performance Optimization

### Frontend:
- Code splitting for faster load times
- Lazy loading of components
- Image optimization
- Browser caching
- Minified assets

### Backend:
- Database query optimization
- Connection pooling
- Response caching
- Compression middleware
- Efficient routing

### Infrastructure:
- CDN for static content
- Load balancing
- Database indexing
- Horizontal scaling
- Auto-scaling capabilities

---

## Future Enhancements

🔄 **Real-time Features**: WebSocket integration for live updates  
🔄 **Mobile Apps**: Native iOS and Android applications  
🔄 **Analytics**: Advanced business intelligence dashboard  
🔄 **Multi-language**: Internationalization support  
🔄 **AI Integration**: Smart pricing and recommendations  
🔄 **Additional Payments**: Multiple payment gateway support  

---

## Conclusion

This Hotel Management System demonstrates a modern, scalable, and secure architecture suitable for production deployment. The network design ensures:

- **Security**: Multi-layer protection from client to database
- **Performance**: Optimized infrastructure with caching and load balancing
- **Reliability**: Database replication and automated backups
- **Scalability**: Ready for growth with horizontal scaling
- **Integration**: Seamless third-party service connections

The system is built using industry-standard technologies and best practices, making it maintainable, extensible, and production-ready.

---

**Project**: Hotel Management System  
**Architecture**: Three-Tier Web Application  
**Deployment**: Cloud Infrastructure (Render.com + MongoDB Atlas)  
**Security**: Enterprise-Grade Multi-Layer Protection  
**Status**: Production Ready  

**Document Version**: 1.0  
**Last Updated**: December 2025
