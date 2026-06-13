import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleLinks } from "../utils/menuLinks";

export default function Sidebar() {
	const { user } = useAuth();
	const links = getRoleLinks(user?.role, 18);

	return (
		<aside
			className="main-sidebar sidebar-dark-primary elevation-4 position-fixed"
			style={{ height: "100vh", overflowY: "auto" }}
		>
			{/* Brand Logo */}
			<a
				href="#"
				className="brand-link text-decoration-none d-flex align-items-center"
			>
				<img
					src="/favicon.svg"
					alt="SIAKAD Logo"
					className="brand-image img-circle elevation-3 bg-light"
					style={{ width: "33px", height: "33px", padding: "3px", opacity: ".9" }}
				/>
				<span className="brand-text fw-light">SIAKAD DKN</span>
			</a>

			{/* Sidebar */}
			<div className="sidebar">
				{/* Sidebar user panel (optional) */}
				<div className="user-panel mt-3 pb-3 mb-3 d-flex align-items-center">
					<div className="image">
						<div
							className="bg-secondary text-white d-flex align-items-center justify-content-center rounded-circle img-circle elevation-2"
							style={{ width: "34px", height: "34px", fontSize: "14px" }}
						>
							{user?.name?.charAt(0).toUpperCase()}
						</div>
					</div>
					<div className="info">
						<a
							href="#"
							className="d-block text-decoration-none text-capitalize"
						>
							{user?.role}
						</a>
					</div>
				</div>

				{/* Sidebar Menu */}
				<nav className="mt-2" style={{ paddingBottom: "60px" }}>
					<ul
						className="nav nav-pills nav-sidebar flex-column"
						data-widget="treeview"
						role="menu"
						data-accordion="false"
					>
						<li className="nav-header text-uppercase text-secondary text-xs fw-bold mb-1">
							MENU UTAMA
						</li>

						{links.map((link, idx) => (
							<li className="nav-item mb-1" key={idx}>
								<NavLink
									to={link.path}
									end
									className={({ isActive }) =>
										`nav-link ${isActive ? "active" : ""}`
									}
									style={{ textAlign: "left" }}
								>
									{link.icon}
									<p style={{ textAlign: "left", marginBottom: 0 }}>
										{link.name}
									</p>
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
			</div>
		</aside>
	);
}
