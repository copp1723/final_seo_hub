"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
// Demo data constants
var DEMO_AGENCY_ID = 'demo-agency-001';
var DEMO_DEALERSHIPS = [
    {
        id: 'demo-dealer-001',
        name: 'Premier Auto Dealership',
        website: 'https://premier-auto-demo.com',
        address: '123 Main Street, Austin, TX 78701',
        phone: '(512) 555-0100',
        clientId: 'premier-auto-001',
        package: 'GOLD'
    },
    {
        id: 'demo-dealer-002',
        name: 'Luxury Motors Austin',
        website: 'https://luxury-motors-austin.com',
        address: '456 Highway 290, Austin, TX 78704',
        phone: '(512) 555-0200',
        clientId: 'luxury-motors-002',
        package: 'PLATINUM'
    },
    {
        id: 'demo-dealer-003',
        name: 'Downtown Toyota',
        website: 'https://downtown-toyota.com',
        address: '789 Congress Ave, Austin, TX 78701',
        phone: '(512) 555-0300',
        clientId: 'downtown-toyota-003',
        package: 'SILVER'
    }
];
var DEMO_USERS = [
    {
        id: 'demo-super-admin',
        email: 'demo@seo-hub.com',
        name: 'Demo Admin',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true
    },
    {
        id: 'demo-agency-admin',
        email: 'agency@demo.seo-hub.com',
        name: 'Agency Manager',
        role: 'AGENCY_ADMIN',
        agencyId: DEMO_AGENCY_ID
    },
    {
        id: 'demo-dealer-admin-001',
        email: 'manager@premier-auto.com',
        name: 'John Smith',
        role: 'DEALERSHIP_ADMIN',
        agencyId: DEMO_AGENCY_ID,
        dealershipId: 'demo-dealer-001'
    },
    {
        id: 'demo-dealer-admin-002',
        email: 'manager@luxury-motors.com',
        name: 'Sarah Johnson',
        role: 'DEALERSHIP_ADMIN',
        agencyId: DEMO_AGENCY_ID,
        dealershipId: 'demo-dealer-002'
    }
];
function setupDemoData() {
    return __awaiter(this, void 0, void 0, function () {
        var agency, _i, DEMO_DEALERSHIPS_1, dealerData, dealership, _a, DEMO_USERS_1, userData, user, requestTypes, statuses, dealershipIds, _loop_1, i, conversations, _b, conversations_1, conv, conversation, _c, _d, msg, taskTypes, i, taskData, status_1, _loop_2, _e, DEMO_DEALERSHIPS_2, dealership, today, i, date, currentMonth, currentYear, _f, DEMO_DEALERSHIPS_3, dealership, error_1;
        var _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log('🚀 Setting up comprehensive demo data...');
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 40, , 41]);
                    return [4 /*yield*/, prisma.agencies.upsert({
                            where: { id: DEMO_AGENCY_ID },
                            update: {
                                name: 'Demo Auto Group',
                                primaryColor: '#3b82f6',
                                secondaryColor: '#1e40af',
                                plan: 'enterprise',
                                status: 'active',
                                maxUsers: 50,
                                maxConversations: 1000
                            },
                            create: {
                                id: DEMO_AGENCY_ID,
                                name: 'Demo Auto Group',
                                slug: 'demo-auto-group',
                                domain: 'demo.seo-hub.com',
                                primaryColor: '#3b82f6',
                                secondaryColor: '#1e40af',
                                plan: 'enterprise',
                                status: 'active',
                                maxUsers: 50,
                                maxConversations: 1000
                            }
                        })];
                case 2:
                    agency = _h.sent();
                    console.log('✅ Demo agency created:', agency.name);
                    _i = 0, DEMO_DEALERSHIPS_1 = DEMO_DEALERSHIPS;
                    _h.label = 3;
                case 3:
                    if (!(_i < DEMO_DEALERSHIPS_1.length)) return [3 /*break*/, 6];
                    dealerData = DEMO_DEALERSHIPS_1[_i];
                    return [4 /*yield*/, prisma.dealerships.upsert({
                            where: { id: dealerData.id },
                            update: {
                                name: dealerData.name,
                                website: dealerData.website,
                                address: dealerData.address,
                                phone: dealerData.phone,
                                clientId: dealerData.clientId,
                                activePackageType: dealerData.package,
                                currentBillingPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                                currentBillingPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
                                pagesUsedThisPeriod: dealerData.package === 'GOLD' ? 8 : dealerData.package === 'PLATINUM' ? 12 : 2,
                                blogsUsedThisPeriod: dealerData.package === 'GOLD' ? 6 : dealerData.package === 'PLATINUM' ? 9 : 3,
                                gbpPostsUsedThisPeriod: dealerData.package === 'GOLD' ? 15 : dealerData.package === 'PLATINUM' ? 18 : 6,
                                improvementsUsedThisPeriod: dealerData.package === 'GOLD' ? 9 : dealerData.package === 'PLATINUM' ? 11 : 0,
                                settings: {
                                    branding: {
                                        primaryColor: dealerData.id === 'demo-dealer-001' ? '#003f7f' : '#eb0a1e',
                                        logoUrl: null
                                    },
                                    seo: {
                                        targetRadius: 25,
                                        primaryKeywords: [
                                            "".concat(dealerData.name.split(' ')[0], " dealer Austin"),
                                            'new cars Austin',
                                            'used cars Austin',
                                            'auto service Austin'
                                        ]
                                    }
                                }
                            },
                            create: {
                                id: dealerData.id,
                                name: dealerData.name,
                                agencyId: DEMO_AGENCY_ID,
                                website: dealerData.website,
                                address: dealerData.address,
                                phone: dealerData.phone,
                                clientId: dealerData.clientId,
                                activePackageType: dealerData.package,
                                currentBillingPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                                currentBillingPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                                pagesUsedThisPeriod: dealerData.package === 'GOLD' ? 8 : dealerData.package === 'PLATINUM' ? 12 : 2,
                                blogsUsedThisPeriod: dealerData.package === 'GOLD' ? 6 : dealerData.package === 'PLATINUM' ? 9 : 3,
                                gbpPostsUsedThisPeriod: dealerData.package === 'GOLD' ? 15 : dealerData.package === 'PLATINUM' ? 18 : 6,
                                improvementsUsedThisPeriod: dealerData.package === 'GOLD' ? 9 : dealerData.package === 'PLATINUM' ? 11 : 0,
                                settings: {
                                    branding: {
                                        primaryColor: dealerData.id === 'demo-dealer-001' ? '#003f7f' : '#eb0a1e',
                                        logoUrl: null
                                    },
                                    seo: {
                                        targetRadius: 25,
                                        primaryKeywords: [
                                            "".concat(dealerData.name.split(' ')[0], " dealer Austin"),
                                            'new cars Austin',
                                            'used cars Austin',
                                            'auto service Austin'
                                        ]
                                    }
                                }
                            }
                        })];
                case 4:
                    dealership = _h.sent();
                    console.log('✅ Dealership created:', dealership.name);
                    _h.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    _a = 0, DEMO_USERS_1 = DEMO_USERS;
                    _h.label = 7;
                case 7:
                    if (!(_a < DEMO_USERS_1.length)) return [3 /*break*/, 11];
                    userData = DEMO_USERS_1[_a];
                    return [4 /*yield*/, prisma.users.upsert({
                            where: { email: userData.email },
                            update: {
                                name: userData.name,
                                role: userData.role,
                                isSuperAdmin: userData.isSuperAdmin || false,
                                agencyId: userData.agencyId,
                                dealershipId: userData.dealershipId,
                                onboardingCompleted: true
                            },
                            create: {
                                id: userData.id,
                                email: userData.email,
                                name: userData.name,
                                role: userData.role,
                                isSuperAdmin: userData.isSuperAdmin || false,
                                agencyId: userData.agencyId,
                                dealershipId: userData.dealershipId,
                                onboardingCompleted: true,
                                emailVerified: new Date()
                            }
                        })];
                case 8:
                    user = _h.sent();
                    console.log('✅ User created:', user.email);
                    // Create user preferences
                    return [4 /*yield*/, prisma.user_preferences.upsert({
                            where: { userId: user.id },
                            update: {},
                            create: {
                                userId: user.id,
                                emailNotifications: true,
                                requestCreated: true,
                                statusChanged: true,
                                taskCompleted: true,
                                weeklySummary: true,
                                marketingEmails: false,
                                timezone: 'America/Chicago',
                                language: 'en'
                            }
                        })];
                case 9:
                    // Create user preferences
                    _h.sent();
                    _h.label = 10;
                case 10:
                    _a++;
                    return [3 /*break*/, 7];
                case 11:
                    requestTypes = [
                        { type: 'page', title: 'Landing Page Optimization', description: 'Optimize vehicle inventory page for Honda Civic 2024 keywords' },
                        { type: 'blog', title: '5 Tips for First-Time Car Buyers', description: 'Educational blog post targeting first-time car buyers in Austin area' },
                        { type: 'gbp_post', title: 'Monthly Promotion Post', description: 'Google Business Profile post for end-of-year sales event' },
                        { type: 'improvement', title: 'Site Speed Optimization', description: 'Technical SEO improvements to increase page load speed' },
                        { type: 'page', title: 'Service Department Page', description: 'Create new page for automotive service and repair offerings' },
                        { type: 'blog', title: 'Electric Vehicle Guide', description: 'Comprehensive guide to available EV models and incentives' },
                        { type: 'gbp_post', title: 'Holiday Hours Update', description: 'Update Google Business Profile with holiday schedule' },
                        { type: 'page', title: 'Finance Calculator Integration', description: 'Add interactive finance calculator to vehicle pages' }
                    ];
                    statuses = ['COMPLETED', 'IN_PROGRESS', 'PENDING'];
                    dealershipIds = DEMO_DEALERSHIPS.map(function (d) { return d.id; });
                    _loop_1 = function (i) {
                        var requestData, status_2, dealershipId, dealerUser;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0:
                                    requestData = requestTypes[i % requestTypes.length];
                                    status_2 = i < 20 ? 'COMPLETED' : i < 25 ? 'IN_PROGRESS' : 'PENDING';
                                    dealershipId = dealershipIds[i % dealershipIds.length];
                                    dealerUser = DEMO_USERS.find(function (u) { return u.dealershipId === dealershipId; }) || DEMO_USERS[2];
                                    return [4 /*yield*/, prisma.requests.create({
                                            data: {
                                                userId: dealerUser.id,
                                                agencyId: DEMO_AGENCY_ID,
                                                dealershipId: dealershipId,
                                                title: requestData.title,
                                                description: requestData.description,
                                                type: requestData.type,
                                                priority: i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MEDIUM' : 'LOW',
                                                status: status_2,
                                                packageType: (_g = DEMO_DEALERSHIPS.find(function (d) { return d.id === dealershipId; })) === null || _g === void 0 ? void 0 : _g.package,
                                                keywords: {
                                                    primary: ["".concat(requestData.title.split(' ')[0], " Austin"), 'car dealer Austin'],
                                                    secondary: ['best dealership', 'auto sales', 'vehicle service']
                                                },
                                                targetUrl: requestData.type === 'page' ? "https://example.com/".concat(requestData.title.toLowerCase().replace(/ /g, '-')) : null,
                                                targetCities: ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown'],
                                                targetModels: ['Honda Civic', 'Toyota Camry', 'Ford F-150'],
                                                completedAt: status_2 === 'COMPLETED' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
                                                createdAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000)
                                            }
                                        })];
                                case 1:
                                    _j.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _h.label = 12;
                case 12:
                    if (!(i < 30)) return [3 /*break*/, 15];
                    return [5 /*yield**/, _loop_1(i)];
                case 13:
                    _h.sent();
                    _h.label = 14;
                case 14:
                    i++;
                    return [3 /*break*/, 12];
                case 15:
                    console.log('✅ Created 30 demo requests');
                    conversations = [
                        {
                            title: 'SEO Package Questions',
                            messages: [
                                { role: 'user', content: 'What does my Gold SEO package include?' },
                                { role: 'assistant', content: 'Your Gold SEO package includes:\n\n• 6 optimized landing pages\n• 8 monthly blog posts\n• 16 Google Business Profile posts\n• Technical SEO improvements\n• Monthly performance reports\n• Keyword research and optimization\n\nThis comprehensive package is designed to improve your dealership\'s online visibility and drive more qualified traffic to your website.' }
                            ]
                        },
                        {
                            title: 'Performance Metrics',
                            messages: [
                                { role: 'user', content: 'How can I track my SEO performance?' },
                                { role: 'assistant', content: 'You can track your SEO performance through:\n\n1. **Dashboard Analytics**: Real-time metrics showing sessions, users, clicks, and impressions\n2. **Monthly Reports**: Detailed performance summaries sent to your email\n3. **Google Analytics Integration**: Direct access to your GA4 data\n4. **Search Console Metrics**: Track keyword rankings and search visibility\n\nYour current metrics show strong growth with 24,680 sessions and 8,940 clicks this month!' }
                            ]
                        }
                    ];
                    _b = 0, conversations_1 = conversations;
                    _h.label = 16;
                case 16:
                    if (!(_b < conversations_1.length)) return [3 /*break*/, 22];
                    conv = conversations_1[_b];
                    return [4 /*yield*/, prisma.conversations.create({
                            data: {
                                title: conv.title,
                                agencyId: DEMO_AGENCY_ID,
                                userId: DEMO_USERS[2].id, // Dealership admin
                                messageCount: conv.messages.length,
                                lastMessage: conv.messages[conv.messages.length - 1].content.substring(0, 100),
                                lastMessageAt: new Date()
                            }
                        })];
                case 17:
                    conversation = _h.sent();
                    _c = 0, _d = conv.messages;
                    _h.label = 18;
                case 18:
                    if (!(_c < _d.length)) return [3 /*break*/, 21];
                    msg = _d[_c];
                    return [4 /*yield*/, prisma.messages.create({
                            data: {
                                conversationId: conversation.id,
                                agencyId: DEMO_AGENCY_ID,
                                userId: DEMO_USERS[2].id,
                                role: msg.role,
                                content: msg.content,
                                model: msg.role === 'assistant' ? 'gpt-4-turbo' : null
                            }
                        })];
                case 19:
                    _h.sent();
                    _h.label = 20;
                case 20:
                    _c++;
                    return [3 /*break*/, 18];
                case 21:
                    _b++;
                    return [3 /*break*/, 16];
                case 22:
                    console.log('✅ Created demo conversations');
                    taskTypes = [
                        { type: 'PAGE', title: 'Review Landing Page Copy', description: 'Review and approve new landing page content' },
                        { type: 'BLOG', title: 'Approve Blog Post', description: 'Review "Car Maintenance Tips" blog post' },
                        { type: 'GBP_POST', title: 'Schedule GBP Update', description: 'Schedule this week\'s Google Business Profile post' },
                        { type: 'IMPROVEMENT', title: 'Implement Schema Markup', description: 'Add structured data to vehicle inventory pages' }
                    ];
                    i = 0;
                    _h.label = 23;
                case 23:
                    if (!(i < 8)) return [3 /*break*/, 26];
                    taskData = taskTypes[i % taskTypes.length];
                    status_1 = i < 4 ? 'COMPLETED' : i < 6 ? 'IN_PROGRESS' : 'PENDING';
                    return [4 /*yield*/, prisma.tasks.create({
                            data: {
                                userId: DEMO_USERS[2].id,
                                dealershipId: 'demo-dealer-001',
                                agencyId: DEMO_AGENCY_ID,
                                type: taskData.type,
                                status: status_1,
                                title: taskData.title,
                                description: taskData.description,
                                priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
                                completedAt: status_1 === 'COMPLETED' ? new Date(Date.now() - i * 24 * 60 * 60 * 1000) : null
                            }
                        })];
                case 24:
                    _h.sent();
                    _h.label = 25;
                case 25:
                    i++;
                    return [3 /*break*/, 23];
                case 26:
                    console.log('✅ Created demo tasks');
                    _loop_2 = function (dealership) {
                        var dealerUser;
                        return __generator(this, function (_k) {
                            switch (_k.label) {
                                case 0:
                                    dealerUser = DEMO_USERS.find(function (u) { return u.dealershipId === dealership.id; });
                                    if (!dealerUser) return [3 /*break*/, 3];
                                    // GA4 Connection
                                    return [4 /*yield*/, prisma.ga4_connections.upsert({
                                            where: {
                                                userId_dealershipId: {
                                                    userId: dealerUser.id,
                                                    dealershipId: dealership.id
                                                }
                                            },
                                            update: {
                                                propertyId: "GA4-DEMO-".concat(dealership.id),
                                                propertyName: "".concat(dealership.name, " - GA4 Property")
                                            },
                                            create: {
                                                userId: dealerUser.id,
                                                dealershipId: dealership.id,
                                                accessToken: 'demo-access-token',
                                                refreshToken: 'demo-refresh-token',
                                                propertyId: "GA4-DEMO-".concat(dealership.id),
                                                propertyName: "".concat(dealership.name, " - GA4 Property"),
                                                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
                                            }
                                        })
                                        // Search Console Connection
                                    ];
                                case 1:
                                    // GA4 Connection
                                    _k.sent();
                                    // Search Console Connection
                                    return [4 /*yield*/, prisma.search_console_connections.upsert({
                                            where: {
                                                userId_dealershipId: {
                                                    userId: dealerUser.id,
                                                    dealershipId: dealership.id
                                                }
                                            },
                                            update: {
                                                siteUrl: dealership.website,
                                                siteName: dealership.name
                                            },
                                            create: {
                                                userId: dealerUser.id,
                                                dealershipId: dealership.id,
                                                accessToken: 'demo-access-token',
                                                refreshToken: 'demo-refresh-token',
                                                siteUrl: dealership.website,
                                                siteName: dealership.name,
                                                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                                            }
                                        })];
                                case 2:
                                    // Search Console Connection
                                    _k.sent();
                                    _k.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _e = 0, DEMO_DEALERSHIPS_2 = DEMO_DEALERSHIPS;
                    _h.label = 27;
                case 27:
                    if (!(_e < DEMO_DEALERSHIPS_2.length)) return [3 /*break*/, 30];
                    dealership = DEMO_DEALERSHIPS_2[_e];
                    return [5 /*yield**/, _loop_2(dealership)];
                case 28:
                    _h.sent();
                    _h.label = 29;
                case 29:
                    _e++;
                    return [3 /*break*/, 27];
                case 30:
                    console.log('✅ Created demo integrations');
                    today = new Date();
                    i = 0;
                    _h.label = 31;
                case 31:
                    if (!(i < 30)) return [3 /*break*/, 35];
                    date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, prisma.usage_metrics.create({
                            data: {
                                agencyId: DEMO_AGENCY_ID,
                                metricType: 'page_views',
                                value: Math.floor(2000 + Math.random() * 1000),
                                date: date,
                                period: 'daily'
                            }
                        })];
                case 32:
                    _h.sent();
                    return [4 /*yield*/, prisma.usage_metrics.create({
                            data: {
                                agencyId: DEMO_AGENCY_ID,
                                metricType: 'api_calls',
                                value: Math.floor(500 + Math.random() * 200),
                                date: date,
                                period: 'daily'
                            }
                        })];
                case 33:
                    _h.sent();
                    _h.label = 34;
                case 34:
                    i++;
                    return [3 /*break*/, 31];
                case 35:
                    console.log('✅ Created usage metrics');
                    currentMonth = today.getMonth() + 1;
                    currentYear = today.getFullYear();
                    _f = 0, DEMO_DEALERSHIPS_3 = DEMO_DEALERSHIPS;
                    _h.label = 36;
                case 36:
                    if (!(_f < DEMO_DEALERSHIPS_3.length)) return [3 /*break*/, 39];
                    dealership = DEMO_DEALERSHIPS_3[_f];
                    return [4 /*yield*/, prisma.monthly_usage.create({
                            data: {
                                dealershipId: dealership.id,
                                month: currentMonth - 1 || 12,
                                year: currentMonth - 1 ? currentYear : currentYear - 1,
                                packageType: dealership.package,
                                pagesUsed: dealership.package === 'GOLD' ? 6 : dealership.package === 'PLATINUM' ? 9 : 3,
                                blogsUsed: dealership.package === 'GOLD' ? 8 : dealership.package === 'PLATINUM' ? 12 : 4,
                                gbpPostsUsed: dealership.package === 'GOLD' ? 16 : dealership.package === 'PLATINUM' ? 20 : 8,
                                improvementsUsed: dealership.package === 'GOLD' ? 12 : dealership.package === 'PLATINUM' ? 15 : 0
                            }
                        })];
                case 37:
                    _h.sent();
                    _h.label = 38;
                case 38:
                    _f++;
                    return [3 /*break*/, 36];
                case 39:
                    console.log('✅ Created monthly usage archives');
                    console.log('\n🎉 Comprehensive demo data setup complete!');
                    console.log('\n📧 Demo Accounts:');
                    console.log('   • Super Admin: demo@seo-hub.com');
                    console.log('   • Agency Admin: agency@demo.seo-hub.com');
                    console.log('   • Dealership Manager (Premier): manager@premier-auto.com');
                    console.log('   • Dealership Manager (Luxury): manager@luxury-motors.com');
                    console.log('\n🚗 Demo Dealerships:');
                    DEMO_DEALERSHIPS.forEach(function (d) {
                        console.log("   \u2022 ".concat(d.name, " (").concat(d.package, " Package)"));
                    });
                    console.log('\n✨ All features populated with realistic demo data!');
                    return [3 /*break*/, 41];
                case 40:
                    error_1 = _h.sent();
                    console.error('❌ Error setting up demo data:', error_1);
                    throw error_1;
                case 41: return [2 /*return*/];
            }
        });
    });
}
// Run the setup
setupDemoData()
    .catch(function (e) {
    console.error('Failed to setup demo data:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
