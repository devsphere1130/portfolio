# Quick Start Guide

## Start Backend (Django)

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Activate the virtual environment:
   ```bash
   .\venv\Scripts\Activate.ps1
   ```

3. Run the Django development server:
   ```bash
   python manage.py runserver
   ```

   **Backend URL**: http://localhost:8000
   **Admin Panel**: http://localhost:8000/admin
   **API**: http://localhost:8000/api

## Start Frontend (React)

1. Open another terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Run the React development server:
   ```bash
   npm run dev
   ```

   **Frontend URL**: http://localhost:5173

## First Time Setup

### Create Admin User (Backend)
After starting the backend for the first time, create a superuser:

```bash
python manage.py createsuperuser
```

Follow the prompts to create your admin account. Then visit http://localhost:8000/admin to log in and add:
- Projects
- Skills
- About information

## Project Files Structure

### Backend
```
backend/
├── portfolio_api/          # Main Django project
│   ├── settings.py        # Project settings (CORS, REST_FRAMEWORK configured)
│   ├── urls.py           # Main URL routing
│   └── wsgi.py
├── portfolio/            # Django app
│   ├── models.py         # Project, Skill, About models
│   ├── views.py          # API views (ViewSets)
│   ├── serializers.py    # DRF serializers
│   ├── urls.py           # App routing with Router
│   ├── admin.py          # Admin panel registration
│   └── migrations/       # Database migrations
├── manage.py             # Django management
├── requirements.txt      # Python dependencies
└── .env                 # Environment variables
```

### Frontend
```
frontend/
├── src/
│   ├── App.jsx           # Main App component
│   ├── main.jsx          # Entry point
│   └── index.css         # Styles
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
└── package.json          # NPM dependencies
```

## API Endpoints

All endpoints are prefixed with `/api/`:

- **GET** `/projects/` - List all projects
- **POST** `/projects/` - Create new project
- **GET** `/projects/{id}/` - Get project details
- **PUT** `/projects/{id}/` - Update project
- **DELETE** `/projects/{id}/` - Delete project

- **GET** `/skills/` - List all skills
- **POST** `/skills/` - Create new skill
- **GET** `/skills/{id}/` - Get skill details
- **PUT** `/skills/{id}/` - Update skill
- **DELETE** `/skills/{id}/` - Delete skill

- **GET** `/about/` - List about sections
- **POST** `/about/` - Create about section
- **GET** `/about/{id}/` - Get about details
- **PUT** `/about/{id}/` - Update about
- **DELETE** `/about/{id}/` - Delete about

## Next Steps

1. **Add Content**: Visit http://localhost:8000/admin to add projects, skills, and about information
2. **Build Frontend**: Create React components to display the data from the API
3. **Customize**: Modify models, add fields, create more endpoints as needed
4. **Deploy**: When ready, deploy backend to a server and frontend to a hosting service

## Common Commands

### Backend
```bash
# Create new Django app
python manage.py startapp appname

# Create database migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Run tests
python manage.py test

# Create superuser
python manage.py createsuperuser

# Access Django shell
python manage.py shell
```

### Frontend
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name
```

## Troubleshooting

- **Backend port already in use**: Run `python manage.py runserver 8001`
- **Frontend not connecting to backend**: Check CORS settings in `backend/portfolio_api/settings.py`
- **ModuleNotFoundError**: Ensure virtual environment is activated
- **Database errors**: Run `python manage.py migrate --run-syncdb`

## Support

Refer to the main README.md for more detailed documentation.
