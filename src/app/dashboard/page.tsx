'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  artist: string
  description?: string
  coverImage?: string
  status: string
  createdAt: string
  user: {
    name: string
    email: string
  }
  tracks: Array<{
    id: string
    name: string
    audioVersions: Array<{
      id: string
      versionType: string
    }>
  }>
}

interface User {
  id: string
  name: string
  email: string
  phone?: string
  profilePicture?: string
  role: string
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  const [newProject, setNewProject] = useState({
    name: '',
    artist: '',
    description: '',
    coverImage: ''
  })

  useEffect(() => {
    checkAuth()
    fetchProjects()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/user/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push('/auth')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh projects list
        fetchProjects()
        // Reset form
        setNewProject({ name: '', artist: '', description: '', coverImage: '' })
        setShowCreateProject(false)
      } else {
        setCreateError(data.error || 'Failed to create project')
      }
    } catch {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewProject(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProject(projectId)
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the project from the local state
        setProjects(prev => prev.filter(p => p.id !== projectId))
        setShowDeleteConfirm(null)
      } else {
        const error = await response.json()
        console.error('Failed to delete project:', error)
        alert('Failed to delete project. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Network error. Please try again.')
    } finally {
      setDeletingProject(null)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span>Loading your projects...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="%23ffffff" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>')`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-sm border-b border-red-900/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">JWX</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">JWX Studio</h1>
                    <p className="text-red-300 text-sm">Your Projects</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  New Project
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user ? getInitials(user.name) : 'U'}
                      </span>
                    </div>
                    <span className="text-white font-medium">{user?.name}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Create New Project</h3>
                  <button
                    onClick={() => setShowCreateProject(false)}
                    className="text-white hover:text-red-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                {createError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{createError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    name="name"
                    value={newProject.name}
                    onChange={handleProjectInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label htmlFor="artistName" className="block text-sm font-medium text-gray-700 mb-1">
                    Artist Name *
                  </label>
                  <input
                    type="text"
                    id="artistName"
                    name="artist"
                    value={newProject.artist}
                    onChange={handleProjectInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Enter artist name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newProject.description}
                    onChange={handleProjectInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Enter project description"
                  />
                </div>

                <div>
                  <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    id="coverImage"
                    name="coverImage"
                    value={newProject.coverImage}
                    onChange={handleProjectInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newProject.name.trim() || !newProject.artist.trim()}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {creating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create Project'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 rounded-t-2xl">
                <h3 className="text-xl font-bold text-white">Delete Project</h3>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this project? This action cannot be undone and will permanently delete all tracks and audio files.
                </p>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    disabled={deletingProject === showDeleteConfirm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteProject(showDeleteConfirm)}
                    disabled={deletingProject === showDeleteConfirm}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {deletingProject === showDeleteConfirm ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      'Delete Project'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Your Albums</h2>
            <p className="text-red-200">Manage your audio projects and collaborate with your team</p>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                <p className="text-red-200 mb-6">Create your first album to get started with professional audio collaboration</p>
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Your First Project
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                >
                  {/* Album Cover */}
                  <div className="aspect-square bg-gradient-to-br from-red-100 to-red-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {project.coverImage ? (
                      <img 
                        src={project.coverImage} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                          </svg>
                        </div>
                        <span className="text-red-600 text-sm font-medium">No Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-red-600 transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : project.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status.toLowerCase()}
                      </span>
                    </div>
                    
                    <p className="text-red-600 font-medium">{project.artist}</p>
                    
                    {project.description && (
                      <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        {project.tracks.length} track{project.tracks.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                      <Link
                        href={`/project/${project.id}`}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-center mr-2"
                      >
                        Open Project
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setShowDeleteConfirm(project.id)
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}