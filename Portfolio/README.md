# Portfolio Application

A full-stack portfolio application built with React.js frontend and Django REST API backend.

## Project Structure

```
Portfolio/
├── frontend/          # React.js application (Vite)
├── backend/           # Django REST API
└── README.md
```

## Backend Setup (Django)

### Prerequisites
- Python 3.8+
- pip

### Installation & Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows PowerShell
   # or
   source venv/bin/activate      # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   - The `.env` file is already created with default settings
   - Update `SECRET_KEY` and other settings as needed for production

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (admin account)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```
   - Backend API will be available at: `http://localhost:8000`
   - Admin panel: `http://localhost:8000/admin`
   - API endpoints:
     - `/api/projects/` - Project list and creation
     - `/api/skills/` - Skill list and management
     - `/api/about/` - About section

### Backend Features

- **Project Management**: Create, read, update, delete portfolio projects
- **Skills Tracking**: Manage your professional skills with proficiency levels
- **About Section**: Manage your portfolio's about section
- **CORS Support**: Configured to accept requests from React frontend
- **Admin Panel**: Full admin interface for easy data management
- **REST API**: Standard REST endpoints for all models

### Database Models

1. **Project**
   - Title, Description, Image URL
   - Project Link, GitHub Link
   - Technologies (comma-separated)
   - Timestamps (created_at, updated_at)

2. **Skill**
   - Name, Category
   - Proficiency Level (0-100)

3. **About**
   - Title, Bio
   - Email, Phone, Location
   - Resume Link

## Frontend Setup (React.js)

### Prerequisites
- Node.js 14+
- npm or yarn

### Installation & Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```
   - Frontend will be available at: `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```
   - Production build will be in the `dist/` directory

### Frontend Features

- **Vite Build Tool**: Fast development experience with hot module replacement
- **Oxlint**: Built-in linting for code quality
- **React 18**: Latest React features and hooks
- **Responsive Design**: Mobile-friendly portfolio

### Frontend Structure

```
src/
├── App.jsx
├── main.jsx
├── index.css
└── assets/
```

## API Integration

The frontend communicates with the backend API at `http://localhost:8000/api/`

### Example API Requests

```javascript
// Fetch projects
fetch('http://localhost:8000/api/projects/')

// Create new project
fetch('http://localhost:8000/api/projects/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Project',
    description: 'Description',
    technologies: 'React, Django',
    link: 'https://example.com'
  })
})

// Fetch skills
fetch('http://localhost:8000/api/skills/')

// Fetch about section
fetch('http://localhost:8000/api/about/')
```

## Running Both Applications

### Terminal 1 - Backend
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Activate virtual environment
python manage.py runserver
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Now you can:
- View portfolio: `http://localhost:5173`
- Access API: `http://localhost:8000/api`
- Manage data: `http://localhost:8000/admin`

## Technologies Used

### Backend
- Django 6.1
- Django REST Framework 3.18.0
- django-cors-headers 4.9.0
- Python 3.13.1

### Frontend
- React 18+
- Vite 8.2.1
- Node.js

## Development Tips

### Backend
- Use Django admin (`/admin`) to manage portfolio content
- API documentation available at `/api/` endpoint
- Use `.env` file for sensitive configuration

### Frontend
- Use `npm run dev` for development with hot reload
- Components should be in `src/` directory
- API calls should use `http://localhost:8000/api/`

## Deployment Considerations

### Backend
- Change `DEBUG = False` in production
- Update `SECRET_KEY` with a secure value
- Set `ALLOWED_HOSTS` to your domain
- Use a production database (PostgreSQL recommended)
- Use environment variables for sensitive data

### Frontend
- Build with `npm run build`
- Deploy `dist/` folder to hosting service
- Update API URL to production backend

## Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Run on different port: `python manage.py runserver 8001`
- **ModuleNotFoundError**: Ensure virtual environment is activated
- **Migration errors**: Run `python manage.py migrate --run-syncdb`

### Frontend Issues
- **Port 5173 already in use**: Vite will automatically use next available port
- **API connection issues**: Check CORS_ALLOWED_ORIGINS in Django settings
- **Module not found**: Run `npm install` to install missing dependencies

## Contributing

Feel free to add more models, endpoints, and features to enhance your portfolio application.

## License

This project is open source and available for personal use.
