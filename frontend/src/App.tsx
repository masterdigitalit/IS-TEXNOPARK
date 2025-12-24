// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./components/pages/HomePage";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import Navbar from "./components/layout/Navbar";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleBasedRedirect } from "./components/auth/RoleBasedRedirect";
import ProfilePage from "./components/profile/ProfilePage";
import AdminDashboard from "./components/admin/AdminDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
import { UserList } from "./components/admin/users/UsersPage";
import { UserProfilePage } from "./components/admin/users/id/UserEditPage";
import { EventList } from "./components/admin/events/EventList";
import {EventListPublic} from './components/student/events/EventList'
import { EventDetails } from "./components/student/events/ShowEvent";
// import TeacherDashboard from './components/dashboards/TeacherDashboard';
// import RefereeDashboard from './components/dashboards/RefereeDashboard';

// Временные компоненты (создайте их позже)
const TeacherDashboard = () => (
	<div className="p-6">
		<h1 className="text-3xl font-bold mb-6">Панель учителя</h1>
		<p>Здесь будет интерфейс для учителей</p>
	</div>
);

const RefereeDashboard = () => (
	<div className="p-6">
		<h1 className="text-3xl font-bold mb-6">Панель судьи</h1>
		<p>Здесь будет интерфейс для судей</p>
	</div>
);

function App() {
	return (
		<Router>
			<AuthProvider>
				<div className="min-h-screen bg-gray-50">
					<Navbar />
					<Routes>
						{/* Публичные роуты */}
						<Route path="/" element={<HomePage />} />
						<Route path="/login" element={<LoginForm />} />
						<Route path="/register" element={<RegisterForm />} />
						<Route path="/profile" element={<ProfilePage />} />

						{/* Редирект после логина */}
						<Route
							path="/login-redirect"
							element={
								<ProtectedRoute>
									<RoleBasedRedirect />
								</ProtectedRoute>
							}
						/>

						{/* Ролевые роуты */}
						<Route
							path="/admin/dashboard"
							element={
								<ProtectedRoute requiredRole="admin">
									<AdminDashboard />
								</ProtectedRoute>
							}
						/>
            	<Route
							path="/admin/events"
							element={
								<ProtectedRoute requiredRole="admin">
									<EventList />
								</ProtectedRoute>
							}
						/>
            
						<Route
							path="/admin/users"
							element={
								<ProtectedRoute requiredRole="admin">
									<UserList />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/users/:id"
							element={
								<ProtectedRoute requiredRole="admin">
									<UserProfilePage />
								</ProtectedRoute>
							}
						/>

						<Route
							path="/admin/*"
							element={
								<ProtectedRoute requiredRole="admin">
									<AdminDashboard />
								</ProtectedRoute>
							}
						/>

						<Route
							path="/user/dashboard"
							element={
								<ProtectedRoute requiredRole="user">
									<StudentDashboard />
								</ProtectedRoute>
							}
						/>
									<Route
							path="/user/events"
							element={
								<ProtectedRoute requiredRole="user">
									<EventListPublic />
								</ProtectedRoute>
							}
						/>
											<Route
							path="/user/events/:id"
							element={
								<ProtectedRoute requiredRole="user">
									<EventDetails />
								</ProtectedRoute>
							}
						/>
						

					

						{/* 404 страница */}
						<Route
							path="*"
							element={
								<div className="container mx-auto px-4 py-20 text-center">
									<h1 className="text-4xl font-bold mb-4">404</h1>
									<p className="text-gray-600 mb-8">Страница не найдена</p>
								</div>
							}
						/>
					</Routes>
				</div>
			</AuthProvider>
		</Router>
	);
}

export default App;
