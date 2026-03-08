// EmailJS Integration Service

class EmailService {
    constructor() {
        this.serviceId = 'service_sxm6fjr';
        this.templateId = 'template_95nab8f';
        this.publicKey = 't3d7vDe63YCxVvUs0';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        // Dynamically inject EmailJS script if not present
        if (typeof emailjs === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load EmailJS SDK'));
                document.head.appendChild(script);
            });
        }

        try {
            emailjs.init(this.publicKey);
            this.isInitialized = true;
            console.log('✅ EmailJS Initialized');
        } catch (error) {
            console.error('❌ Error initializing EmailJS:', error);
        }
    }

    /**
     * Send an email notification
     * @param {Object} templateParams - Variables mapping to the EmailJS template
     */
    async sendEmail(templateParams) {
        await this.init();
        if (!this.isInitialized) throw new Error('Email service not initialized');

        try {
            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );
            console.log('✅ Email sent successfully!', response.status, response.text);
            return response;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw error; // Let the caller handle UI feedback if needed
        }
    }

    /**
     * Workflow 1: Creator sent a new join request
     */
    async sendRequestNotification(creatorEmail, creatorName, requesterName, groupName, message) {
        return this.sendEmail({
            to_email: creatorEmail,
            to_name: creatorName,
            subject: `New Join Request for ${groupName}`,
            body_message: `${requesterName} has requested to join your group "${groupName}".\n\nThey said: "${message}"\n\nLog in to your dashboard to Approve or Reject this request.`
        });
    }

    /**
     * Workflow 2: Requester is Approved (Includes private link)
     */
    async sendApprovalEmail(requesterEmail, requesterName, groupName, privateLink) {
        return this.sendEmail({
            to_email: requesterEmail,
            to_name: requesterName,
            subject: `✅ Approved: Welcome to ${groupName}!`,
            body_message: `Great news, ${requesterName}!\n\nYour request to join the group "${groupName}" has been approved.\n\nHere is your private invitation link to join the group chat:\n${privateLink}\n\nPlease do not share this link with anyone else.`
        });
    }

    /**
     * Workflow 3: Requester is Rejected
     */
    async sendRejectionEmail(requesterEmail, requesterName, groupName) {
        return this.sendEmail({
            to_email: requesterEmail,
            to_name: requesterName,
            subject: `Update regarding ${groupName}`,
            body_message: `Hi ${requesterName},\n\nThank you for your interest in joining "${groupName}".\n\nUnfortunately, the creator was unable to approve your request at this time. Keep exploring the dashboard for other groups that might be a great fit!`
        });
    }
}

export const emailService = new EmailService();
window.emailService = emailService;
