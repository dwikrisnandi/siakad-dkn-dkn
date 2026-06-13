import { Home, LogOut, User } from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function BottomNav() {
	const { user, logout } = useAuth();
	const location = useLocation();

	if (!user) return null;

	const roleHome = `/${user.role}`;

	return (
		<div
			className="d-md-none position-fixed bottom-0 start-0 end-0 bg-white shadow-lg"
			style={{
				zIndex: 1040,
				height: "65px",
				borderTop: "1px solid #e2e8f0",
				borderTopLeftRadius: "20px",
				borderTopRightRadius: "20px",
			}}
		>
			<div className="d-flex justify-content-around align-items-center h-100 px-3">
				<Link
					to={roleHome}
					className={`text-decoration-none text-center ${location.pathname === roleHome ? "text-primary" : "text-secondary"}`}
				>
					<div
						className={`p-1 px-3 rounded-pill ${location.pathname === roleHome ? "bg-primary bg-opacity-10" : ""}`}
					>
						<Home size={22} className="mb-1" />
						<div
							style={{
								fontSize: "0.7rem",
								fontWeight: location.pathname === roleHome ? "700" : "500",
							}}
						>
							Beranda
						</div>
					</div>
				</Link>
				<div
					className="text-decoration-none text-center text-secondary"
					onClick={() => alert("Profil dalam pengembangan")}
					style={{ cursor: "pointer" }}
				>
					<div className="p-1 px-3">
						<User size={22} className="mb-1" />
						<div style={{ fontSize: "0.7rem", fontWeight: "500" }}>Profil</div>
					</div>
				</div>
				<div
					className="text-decoration-none text-center text-danger"
					onClick={() => {
						if (window.confirm("Yakin ingin keluar dari sistem?")) logout();
					}}
					style={{ cursor: "pointer" }}
				>
					<div className="p-1 px-3">
						<LogOut size={22} className="mb-1" />
						<div style={{ fontSize: "0.7rem", fontWeight: "500" }}>Keluar</div>
					</div>
				</div>
			</div>
		</div>
	);
}
