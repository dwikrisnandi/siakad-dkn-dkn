import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const InstallPWA = () => {
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [isVisible, setIsVisible] = useState(false);
	const { t } = useTranslation();

	useEffect(() => {
		const handler = (e) => {
			// Prevent Chrome 67 and earlier from automatically showing the prompt
			e.preventDefault();
			// Stash the event so it can be triggered later.
			setDeferredPrompt(e);
			// Show the install button
			setIsVisible(true);
		};

		window.addEventListener("beforeinstallprompt", handler);

		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) return;

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);

		// We've used the prompt, and can't use it again, throw it away
		setDeferredPrompt(null);
		setIsVisible(false);
	};

	if (!isVisible) return null;

	return (
		<div
			className="install-pwa-banner card card-outline card-primary shadow"
			style={{
				position: "fixed",
				bottom: "20px",
				right: "20px",
				zIndex: 9999,
				maxWidth: "300px",
			}}
		>
			<div className="card-header">
				<h3 className="card-title">
					<i className="fas fa-mobile-alt me-2"></i> {t('pwa.title', 'Install App')}
				</h3>
				<div className="card-tools">
					<button
						type="button"
						className="btn btn-tool"
						onClick={() => setIsVisible(false)}
					>
						<i className="fas fa-times"></i>
					</button>
				</div>
			</div>
			<div className="card-body">
				{t('pwa.desc', 'Install aplikasi ini di HP Anda untuk akses lebih cepat dan notifikasi real-time.')}
				<button
					className="btn btn-primary w-100 mt-3"
					onClick={handleInstallClick}
				>
					{t('pwa.button', 'Install Sekarang')}
				</button>
			</div>
		</div>
	);
};

export default InstallPWA;
