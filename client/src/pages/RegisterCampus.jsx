import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building, ShieldCheck, User, Globe, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import Swal from "sweetalert2";

export default function RegisterCampus() {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	
	const [plans, setPlans] = useState([]);
	const [loading, setLoading] = useState(false);
	
	const [formData, setFormData] = useState({
		campus_name: "",
		campus_slug: "",
		country: "Indonesia",
		admin_nidn: "",
		admin_name: "",
		admin_password: "",
		plan_id: ""
	});

	useEffect(() => {
		fetchPlans();
	}, []);

	const fetchPlans = async () => {
		try {
			// We skip the axios interceptor if possible or use standard fetch to avoid tenant_slug issues
			const response = await fetch("http://192.168.30.4:8256/api/public/tenant/plans");
			const data = await response.json();
			if (response.ok) {
				setPlans(data);
			}
		} catch (error) {
			console.error("Failed to fetch plans:", error);
		}
	};

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch("http://192.168.30.4:8256/api/public/tenant/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(formData)
			});

			const data = await response.json();

			if (response.ok) {
				Swal.fire({
					icon: "success",
					title: "Berhasil!",
					text: t('register.success'),
					confirmButtonColor: "#3b82f6"
				}).then(() => {
					// Set tenant_slug automatically and redirect to login
					localStorage.setItem("tenant_slug", data.tenant_slug);
					// redirect physically to force loading with the new basename
					window.location.href = `/${data.tenant_slug}/login`;
				});
			} else {
				Swal.fire("Gagal", data.error || t('register.error'), "error");
			}
		} catch (error) {
			Swal.fire("Error", t('register.error'), "error");
		} finally {
			setLoading(false);
		}
	};

	const changeLanguage = (lng) => {
		i18n.changeLanguage(lng);
		window.history.pushState(null, "", `?lang=${lng}`);
	};

	return (
		<div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
			<Helmet>
				<html lang={i18n.language} />
				<title>{t('register.title')} - SIAKAD</title>
			</Helmet>

			<style>{`
				.glass-card {
					background: rgba(255, 255, 255, 0.03);
					backdrop-filter: blur(16px);
					border: 1px solid rgba(255, 255, 255, 0.05);
					border-radius: 24px;
				}
				.form-control, .form-select {
					background: rgba(255, 255, 255, 0.05);
					border: 1px solid rgba(255, 255, 255, 0.1);
					color: white;
				}
				.form-control:focus, .form-select:focus {
					background: rgba(255, 255, 255, 0.1);
					border-color: #3b82f6;
					color: white;
					box-shadow: none;
				}
				.form-control::placeholder {
					color: rgba(255, 255, 255, 0.5);
				}
				.btn-glow {
					background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
					color: white;
					border: none;
					transition: all 0.3s ease;
				}
				.btn-glow:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
					color: white;
				}
			`}</style>

			{/* Navbar */}
			<nav className="d-flex justify-content-between align-items-center p-4">
				<Link to="/" className="text-white text-decoration-none d-flex align-items-center gap-2">
					<ArrowLeft size={20} /> Back to Home
				</Link>
				<div className="dropdown">
					<button className="btn btn-outline-light rounded-pill dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
						<Globe size={18} /> {i18n.language.toUpperCase()}
					</button>
					<ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg" style={{ background: 'rgba(30, 41, 59, 0.95)' }}>
						<li><button className="dropdown-item" onClick={() => changeLanguage('en')}>🇬🇧 English (EN)</button></li>
						<li><button className="dropdown-item" onClick={() => changeLanguage('id')}>🇮🇩 Indonesia (ID)</button></li>
					</ul>
				</div>
			</nav>

			<div className="container py-5">
				<div className="row justify-content-center">
					<div className="col-lg-8">
						<div className="text-center mb-5">
							<h1 className="fw-bolder mb-3">{t('register.title')}</h1>
							<p className="fs-5 text-secondary">{t('register.subtitle')}</p>
						</div>

						<div className="glass-card p-4 p-md-5">
							<form onSubmit={handleSubmit}>
								
								<h4 className="mb-4 d-flex align-items-center gap-2">
									<Building className="text-primary" /> {t('register.campus_info')}
								</h4>
								
								<div className="row g-3 mb-5">
									<div className="col-md-6">
										<label className="form-label">{t('register.campus_name')}</label>
										<input type="text" className="form-control" name="campus_name" value={formData.campus_name} onChange={handleChange} required placeholder="e.g. Universitas Gadjah Mada" />
									</div>
									<div className="col-md-6">
										<label className="form-label">{t('register.campus_slug')}</label>
										<input type="text" className="form-control" name="campus_slug" value={formData.campus_slug} onChange={handleChange} required placeholder="e.g. ugm" pattern="[a-z0-9-]+" title="Hanya huruf kecil, angka, dan strip" />
										<div className="form-text text-secondary mt-1">URL: {formData.campus_slug ? `${formData.campus_slug}.siakad.com` : "yourcampus.siakad.com"}</div>
									</div>
									<div className="col-md-12">
										<label className="form-label">{t('register.country')}</label>
										<select className="form-select" name="country" value={formData.country} onChange={handleChange} required>
											<option value="Indonesia">Indonesia</option>
											<option value="Malaysia">Malaysia</option>
											<option value="Singapore">Singapore</option>
											<option value="United States">United States</option>
											<option value="United Kingdom">United Kingdom</option>
											<option value="Japan">Japan</option>
											<option value="Australia">Australia</option>
										</select>
									</div>
								</div>

								<h4 className="mb-4 d-flex align-items-center gap-2">
									<User className="text-success" /> {t('register.admin_info')}
								</h4>

								<div className="row g-3 mb-5">
									<div className="col-md-6">
										<label className="form-label">{t('register.admin_nidn')}</label>
										<input type="text" className="form-control" name="admin_nidn" value={formData.admin_nidn} onChange={handleChange} required />
									</div>
									<div className="col-md-6">
										<label className="form-label">{t('register.admin_name')}</label>
										<input type="text" className="form-control" name="admin_name" value={formData.admin_name} onChange={handleChange} required />
									</div>
									<div className="col-md-12">
										<label className="form-label">{t('register.admin_password')}</label>
										<input type="password" className="form-control" name="admin_password" value={formData.admin_password} onChange={handleChange} required />
									</div>
								</div>

								<h4 className="mb-4 d-flex align-items-center gap-2">
									<ShieldCheck className="text-warning" /> {t('register.select_plan')}
								</h4>

								<div className="row g-3 mb-5">
									{plans.length === 0 ? (
										<div className="col-12 text-center py-3 text-secondary">Loading plans...</div>
									) : (
										plans.map((plan) => (
											<div className="col-md-6" key={plan.id}>
												<label className="w-100" style={{ cursor: "pointer" }}>
													<input 
														type="radio" 
														name="plan_id" 
														value={plan.id} 
														className="d-none" 
														onChange={handleChange}
														required
													/>
													<div className={`p-4 rounded-3 border ${formData.plan_id == plan.id ? 'border-primary bg-primary bg-opacity-25' : 'border-secondary bg-dark bg-opacity-50'}`} style={{ transition: 'all 0.2s' }}>
														<h5 className="fw-bold">{plan.plan_name}</h5>
														<h3 className="mb-3 text-primary">Rp {parseInt(plan.price_per_month).toLocaleString('id-ID')} <span className="fs-6 text-secondary fw-normal">/ mo</span></h3>
														<ul className="list-unstyled mb-0 text-secondary">
															<li>✓ {t('register.max_students')}: {plan.max_students}</li>
															<li>✓ Full LMS & CBT Features</li>
															<li>✓ 24/7 Support</li>
														</ul>
													</div>
												</label>
											</div>
										))
									)}
								</div>

								<button type="submit" className="btn btn-glow w-100 py-3 fs-5 fw-bold rounded-pill" disabled={loading}>
									{loading ? "Processing..." : t('register.submit')}
								</button>
							</form>
						</div>

					</div>
				</div>
			</div>
		</div>
	);
}
