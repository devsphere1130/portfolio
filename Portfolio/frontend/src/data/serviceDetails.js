// Plain-language service explanations for the interactive service cards.
// Keep copy short and jargon-free: a non-technical visitor should get each one in ~15 seconds.
export const serviceDetails = [
  {
    id: 'product-development',
    title: 'Product Development',
    headline: 'Turn your idea into a working product.',
    summary:
      'We turn your idea into a working digital product. From planning the features to building and launching it, we help bring your idea to life.',
    example:
      'You have an idea for an app that helps people book appointments with local professionals. We can help turn that idea into a product people can actually use.',
    steps: [
      { label: 'Understand', text: 'Understand your idea and the problem it solves.' },
      { label: 'Plan', text: 'Plan the important features and how people will use them.' },
      { label: 'Build', text: 'Design and build the product.' },
      { label: 'Launch', text: 'Test it and prepare it for launch.' },
    ],
    deliverables: [
      'A clear product plan',
      'A usable digital product',
      'Features built around your needs',
      'Testing and launch support',
    ],
    audience: 'Entrepreneurs, startups, and businesses creating a new digital product.',
  },
  {
    id: 'business-software',
    title: 'Business Software',
    headline: 'Run your everyday work from one organized place.',
    summary:
      'We build software that helps your business manage everyday work more easily. Instead of juggling things by hand, your team keeps information and tasks in one organized place.',
    example:
      'A service business tracks customers, appointments, invoices, and staff schedules in separate spreadsheets. We can build one system that brings all of these together.',
    steps: [
      { label: 'Observe', text: 'Understand how your business works day to day.' },
      { label: 'Identify', text: 'Find the repetitive tasks and common problems.' },
      { label: 'Build', text: 'Build software around the way your team works.' },
      { label: 'Refine', text: 'Test it with the people who will use it.' },
    ],
    deliverables: [
      'Software tailored to your business',
      'Better organized information',
      'Less repetitive manual work',
      'Easier day-to-day task management',
    ],
    audience: 'Small businesses, growing companies, and teams that need software suited to the way they actually work.',
  },
  {
    id: 'saas-platforms',
    title: 'SaaS Platforms',
    headline: 'Offer your software online to many customers.',
    summary:
      'SaaS means "software as a service": software people use through a web browser instead of installing it. Customers can sign up, use its features, and manage their own accounts.',
    example:
      'A company wants to offer an online booking service that many different businesses can subscribe to and use from their browsers.',
    steps: [
      { label: 'Plan', text: 'Plan the service and the different kinds of users.' },
      { label: 'Build', text: 'Build accounts, features, and the tools to manage them.' },
      { label: 'Monetize', text: 'Add subscriptions or payments, if your product needs them.' },
      { label: 'Launch', text: 'Test the platform and prepare it for launch.' },
    ],
    deliverables: [
      'An online software platform',
      'User accounts and access levels, where needed',
      'A dashboard to manage the platform',
      'Subscription or payment features, if your product needs them',
    ],
    audience: 'Startups and businesses that want to offer an online software service to many customers.',
  },
  {
    id: 'api-backend',
    title: 'API & Backend Systems',
    headline: 'The engine that works behind the scenes.',
    summary:
      'The backend is the part of software you don’t see. It stores and processes information, applies your business rules, and lets different apps talk to each other safely. An API is the agreed way those apps exchange information.',
    example:
      'When a customer places an order on a shopping website, the backend saves the order, updates its status, and shows the right details in the customer’s account.',
    steps: [
      { label: 'Map', text: 'Understand what information your application needs.' },
      { label: 'Organize', text: 'Organize the data and the rules it must follow.' },
      { label: 'Connect', text: 'Build the systems that handle requests and connect apps.' },
      { label: 'Verify', text: 'Test reliability, permissions, and how data is handled.' },
    ],
    deliverables: [
      'Systems that process your application’s data',
      'A database and your business rules, built in',
      'Connections to other compatible apps',
      'Sensible access controls and error handling',
    ],
    audience: 'Businesses building applications, connecting services, or managing information across several systems.',
  },
  {
    id: 'frontend-engineering',
    title: 'Frontend Engineering',
    headline: 'The part of your website people see and use.',
    summary:
      'Frontend engineering is building the screens people see and click on. We turn designs into pages that respond, feel smooth, and work on phones, tablets, and computers.',
    example:
      'A business has a website design but needs it turned into a working site with navigation, forms, animations, and layouts that fit mobile screens.',
    steps: [
      { label: 'Review', text: 'Review the design and what the site needs to do.' },
      { label: 'Build', text: 'Build the page layouts and reusable pieces.' },
      { label: 'Connect', text: 'Make buttons, forms, and data work as they should.' },
      { label: 'Test', text: 'Test the experience on desktop, tablet, and mobile.' },
    ],
    deliverables: [
      'Website screens that fit every device',
      'Interactive pages and components',
      'Consistent visual styling',
      'Better usability and faster-feeling pages',
    ],
    audience: 'Businesses, designers, startups, and development teams that need polished, working web interfaces.',
  },
  {
    id: 'automation',
    title: 'Automation',
    headline: 'Let software handle the repetitive tasks.',
    summary:
      'Automation lets software take care of routine tasks for you. When something specific happens, the system carries out the next steps on its own, so your team spends less time on busywork.',
    example:
      'When someone fills in a contact form, a system could save the enquiry, notify your sales team, and send the customer a confirmation email.',
    steps: [
      { label: 'Spot', text: 'Find the repetitive tasks and the rules they follow.' },
      { label: 'Define', text: 'Decide what should start each action.' },
      { label: 'Connect', text: 'Connect the tools you use, or build the workflow.' },
      { label: 'Test', text: 'Test the workflow and plan for when things go wrong.' },
    ],
    deliverables: [
      'Automated routine workflows',
      'Connections between tools you use, where they support it',
      'Fewer repetitive manual steps',
      'A clearer view of what each workflow is doing',
    ],
    audience: 'Businesses and teams that spend time on repetitive data entry, notifications, reports, or routine admin work.',
  },
];
