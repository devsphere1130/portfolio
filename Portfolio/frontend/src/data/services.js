// Engineering capabilities. `title`/`description` show on the cards; the rest fills the detail panel.
// Keep detail copy plain-language: explain any technical term where it first appears.
export const servicesData = [
  {
    id: 'web-applications',
    title: 'Web Applications',
    description: 'Responsive, scalable applications that give customers and internal teams a faster way to get work done.',
    headline: 'Give people a better way to get work done.',
    summary:
      'Web applications are interactive websites that help people get tasks done online. Customers or employees can sign in, manage information, submit requests, and complete work from a browser.',
    example:
      'A company wants customers to create accounts, submit service requests, track their progress, and manage their details online, without phone calls or email chains.',
    builds: [
      'Customer portals and employee dashboards',
      'Online booking and management systems',
      'Interactive forms and workflow tools',
      'Responsive web applications for any screen size',
    ],
    steps: [
      { label: 'Understand', text: 'Learn how the work happens today and where it gets stuck.' },
      { label: 'Plan', text: 'Agree on the screens, features, and who uses what.' },
      { label: 'Build', text: 'Design and develop the application in working stages.' },
      { label: 'Release', text: 'Test with real tasks and prepare it for launch.' },
    ],
    outcome:
      'Customers and teams get a more convenient way to complete tasks, without relying on disconnected tools or manual processes.',
  },
  {
    id: 'saas-products',
    title: 'SaaS Products',
    description: 'Multi-user platforms, dashboards, subscriptions and workflows designed to support real product operations.',
    headline: 'One online product, serving many customers.',
    summary:
      'SaaS ("software as a service") is software people use online, often through a subscription. Many customers use the same platform, while each one’s account and information stay properly separated.',
    example:
      'A business wants to offer an online appointment management platform that many different companies can sign up for and use.',
    builds: [
      'User accounts, with different access for different roles',
      'Dashboards and the core product workflows',
      'Subscription and billing connections, when required',
      'Admin tools and account management',
    ],
    steps: [
      { label: 'Understand', text: 'Define who the customers are and what they need to do.' },
      { label: 'Plan', text: 'Decide on account types, access rules, and billing needs.' },
      { label: 'Build', text: 'Develop the platform, dashboards, and admin tools.' },
      { label: 'Release', text: 'Test with realistic accounts and prepare for launch.' },
    ],
    outcome:
      'An online product that can serve many customers and grow as the business develops.',
    note:
      'Subscriptions, payment integrations, and how customer data is separated (often called "multi-tenant" setup) depend on your product’s requirements. We agree on these with you before building.',
  },
  {
    id: 'business-software',
    title: 'Business Software',
    description: 'ERP, CRM, PMS, internal tools and automation that match how the business actually runs.',
    headline: 'Run daily operations from one place.',
    summary:
      'Business software helps a company organize its daily operations in one place. It brings together information, tasks, staff, customers, and processes that would otherwise live in separate tools.',
    example:
      'A growing company keeps customers in spreadsheets, staff tasks in chat messages, and project progress in separate documents. A custom system can bring all of that together.',
    builds: [
      'CRM systems for managing customers',
      'ERP-style workflows for operations, stock, or finance',
      'Project and property management systems',
      'Internal dashboards and operational tools',
      'Automated routine workflows',
    ],
    steps: [
      { label: 'Understand', text: 'Map how your team works today, step by step.' },
      { label: 'Plan', text: 'Choose what to bring together first and what can wait.' },
      { label: 'Build', text: 'Develop the system around your real workflow.' },
      { label: 'Release', text: 'Test with the people who will use it every day.' },
    ],
    outcome:
      'Everyday operations become easier to manage, with less unnecessary manual work.',
    note:
      'CRM means customer relationship management; ERP means software that connects core operations like stock, orders, and finance. The exact features depend on your workflow and the agreed scope.',
  },
  {
    id: 'backend-apis',
    title: 'Backend & APIs',
    description: 'Secure APIs, integrations, databases and business logic that keep products reliable as usage grows.',
    headline: 'The reliable engine behind your product.',
    summary:
      'The backend is the part of an application that works behind the scenes. It processes information, applies business rules, stores data, and connects different systems. An API is the agreed way two systems ask each other for information.',
    example:
      'When a customer places an order, the backend records it, calculates the totals, updates its status, and gives both the customer and your staff the information they need.',
    builds: [
      'APIs that let your apps and other systems talk to each other',
      'Database structures and business rules',
      'Connections between compatible systems',
      'Sign-in and access control, so people only see what they should',
      'Background tasks that run without slowing anyone down',
    ],
    steps: [
      { label: 'Understand', text: 'Learn what information moves where, and the rules it follows.' },
      { label: 'Plan', text: 'Design the data structure and how systems will connect.' },
      { label: 'Build', text: 'Develop the APIs, rules, and integrations.' },
      { label: 'Release', text: 'Test reliability, permissions, and error handling.' },
    ],
    outcome:
      'Applications exchange information reliably and handle business operations consistently.',
  },
  {
    id: 'frontend-engineering',
    title: 'Frontend Engineering',
    description: 'Modern interfaces with clear flows, polished interactions, accessibility and strong performance.',
    headline: 'Interfaces people understand at a glance.',
    summary:
      'Frontend engineering is building the parts of a website or app that people see and use. It turns designs into working screens that are easy to use on desktop, tablet, and mobile.',
    example:
      'A company has a design for a new website and needs it turned into a responsive experience with working navigation, forms, dashboards, and interactive elements.',
    builds: [
      'Responsive website interfaces',
      'Interactive dashboards and step-by-step user journeys',
      'Reusable interface building blocks',
      'Accessible navigation and forms',
      'Fast, lightweight pages',
    ],
    steps: [
      { label: 'Understand', text: 'Review the design and what each screen must do.' },
      { label: 'Plan', text: 'Break the design into reusable pieces and user flows.' },
      { label: 'Build', text: 'Develop the screens and connect them to real data.' },
      { label: 'Release', text: 'Test on different devices, browsers, and with a keyboard.' },
    ],
    outcome:
      'People understand the product quickly, move through it confidently, and finish their tasks with less friction.',
  },
  {
    id: 'system-modernization',
    title: 'System Modernization',
    description: 'Improve existing platforms by reducing friction, strengthening architecture and clarifying the user experience.',
    headline: 'Improve what you have, without starting over.',
    summary:
      'System modernization means improving an existing website or application rather than automatically rebuilding it from scratch. The goal is to remove limitations, improve usability, and make it easier to maintain and extend.',
    example:
      'A business relies on an older application that is hard to use, slow to update, and expensive to maintain. It can be assessed and improved in stages, while it keeps running.',
    buildsLabel: 'What we can help with',
    builds: [
      'Refreshing outdated interfaces',
      'Cleaning up code that is hard to maintain',
      'Updating selected technologies and dependencies',
      'Improving speed and accessibility',
      'Connecting existing systems with newer tools',
    ],
    steps: [
      { label: 'Assess', text: 'Review the current system, its limits, and its risks.' },
      { label: 'Plan', text: 'Agree which improvements matter most, and in what order.' },
      { label: 'Improve', text: 'Make changes in stages, keeping the system usable.' },
      { label: 'Release', text: 'Test each stage carefully before it goes live.' },
    ],
    outcome:
      'Existing software lasts longer, works with less friction, and has a clearer path for future improvements.',
    note:
      'Every system is different. We can only recommend what to improve, keep, or replace after a detailed technical assessment.',
  },
];
