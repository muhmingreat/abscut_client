
import { useState } from "react";
import { apiRequest } from "../services/api";
import "./Contact.css";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};

// ==========================================
// ABS CUT — WHATSAPP COMMUNITY LINKS
// ==========================================

const WHATSAPP_LINKS = {
  chat:"https://wa.me/2348140806540",
  group: "https://chat.whatsapp.com/Ir0dS6Is7bO1Qeaiw0GeiS?s=cl&p=a&mlu=4&ilr=4",
  channel: "https://whatsapp.com/channel/0029Vb99M2YDOQIZXGIfPD03",
};
function Contact() {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setFeedback({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          subject: formData.subject,
          message: formData.message.trim(),
        }),
      });

      // Only show success if the backend confirms the save.
      if (response?.success === false) {
        throw new Error(
          response.message || "Your message could not be sent."
        );
      }

      setFeedback({
        type: "success",
        message:
          response?.message ||
          "Your message has been received by ABS CUT.",
      });

      setFormData({ ...initialFormData });
    } catch (error) {
      console.error("ABS CUT contact submission error:", error);

      setFeedback({
        type: "error",
        message:
          error?.message ||
          "We couldn't send your message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

 

  return (
    <main className="contact-page">
      <section className="contact-header">
        <span className="contact-eyebrow">
          <span className="contact-eyebrow-line" />
          THE ABS CUT EXPERIENCE
        </span>

        <h1>
          Let's Start a <em>Conversation.</em>
        </h1>

        <p>
          Questions about an outfit, a custom design or our
          services? Tell us what you have in mind.
        </p>
      </section>

      <section className="contact-content">
        <aside className="contact-information">
          <div className="contact-info-card">
            <span className="contact-small-label">GET IN TOUCH</span>

            <h2>
              Your Next Great Outfit Starts With a Message.
            </h2>

            <p>
              Whether you are exploring our collection or planning
              something personal, we would love to hear from you.
            </p>
          </div>

          <div className="contact-detail">
            <span className="contact-detail-icon">☎</span>
            <div>
              <span className="contact-detail-label">CALL US</span>
              <a href="tel:08140806540">08140806540</a>
              <a href="tel:09070655906">09070655906</a>
            </div>
          </div>

           
<div className="contact-detail whatsapp-contact">
  <span className="contact-detail-icon whatsapp-main-icon">
    <i className="fa-brands fa-whatsapp" aria-hidden="true" />
  </span>

  <div className="whatsapp-contact-content">
    <span className="contact-detail-label">CONNECT WITH ABS CUT</span>

    <h3>Join Our Fashion Community</h3>

    <p>
      Chat with us, connect with fellow fashion lovers, and
      receive updates on our latest designs and collections.
    </p>

    <div className="whatsapp-community-links">
      <a
        href={WHATSAPP_LINKS.chat}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-community-button whatsapp-chat-button"
      >
        <span aria-hidden="true">✆</span>
        <span>Chat with Us</span>
        <span aria-hidden="true">↗</span>
      </a>

      <a
        href={WHATSAPP_LINKS.group}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-community-button whatsapp-group-button"
        onClick={(event) => {
          if (!WHATSAPP_LINKS.group.startsWith("https://chat.whatsapp.com/")) {
            event.preventDefault();
            alert("Add your actual WhatsApp Group invite link first.");
          }
        }}
      >
        <span aria-hidden="true">◎</span>
        <span>Join WhatsApp Group</span>
        <span aria-hidden="true">↗</span>
      </a>

      <a
        href={WHATSAPP_LINKS.channel}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-community-button whatsapp-channel-button"
        onClick={(event) => {
          if (!WHATSAPP_LINKS.channel.startsWith("https://whatsapp.com/channel/")) {
            event.preventDefault();
            alert("Add your actual WhatsApp Channel link first.");
          }
        }}
      >
        <span aria-hidden="true">◉</span>
        <span>Follow WhatsApp Channel</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </div>
</div>

          <div className="contact-detail">
            <span className="contact-detail-icon">⌖</span>
            <div>
              <span className="contact-detail-label">VISIT US</span>
              <p>
                Plot 1 Block A Barrister Abdul Fatai Abolaji Str,
                Pegamut Estate, Ikeshi/Ota, Ogun State.
              </p>
            </div>
          </div>

          <div className="contact-services">
            <span className="contact-small-label">HOW WE CAN HELP</span>

            <div>
              <span>Native Wear</span>
              <span>Custom Tailoring</span>
              <span>Embroidery</span>
              <span>Monogramming</span>
              <span>Fashion Materials</span>
            </div>
          </div>
        </aside>

        <section className="contact-form-card">
          <div className="contact-form-header">
            <span className="contact-small-label">
              SEND AN ENQUIRY
            </span>

            <h2>Send Us a Message</h2>

            <p>
              Complete the form below and your message will be
              submitted to ABS CUT.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="contact-form-row">
              <div className="contact-form-group">
                <label htmlFor="contact-name">Full Name *</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  maxLength={100}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="contact-form-group">
                <label htmlFor="contact-phone">Phone Number *</label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  maxLength={30}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="contact-form-group">
              <label htmlFor="contact-email">Email Address</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                maxLength={254}
                disabled={submitting}
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="contact-subject">Subject *</label>
              <select
                id="contact-subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                disabled={submitting}
              >
                <option value="">Choose a subject</option>
                <option value="Ready-to-Wear">Ready-to-Wear</option>
                <option value="Custom Tailoring">Custom Tailoring</option>
                <option value="Embroidery">Embroidery</option>
                <option value="Monogramming">Monogramming</option>
                <option value="Fashion Materials">Fashion Materials</option>
                <option value="Existing Order">Existing Order</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="contact-form-group">
              <div className="contact-message-label-row">
                <label htmlFor="contact-message">Your Message *</label>
                <span>{formData.message.length}/5000</span>
              </div>

              <textarea
                id="contact-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us what you need. We are listening..."
                rows={6}
                maxLength={5000}
                required
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              className="contact-submit-button"
              disabled={submitting}
            >
              <span>
                {submitting ? "SENDING MESSAGE..." : "SEND YOUR MESSAGE"}
              </span>
              <span aria-hidden="true">
                {submitting ? "…" : "↗"}
              </span>
            </button>

            {feedback.message && (
              <div
                className={`contact-feedback contact-feedback-${feedback.type}`}
                role={feedback.type === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                <strong>
                  {feedback.type === "success"
                    ? "Message received"
                    : "Message not sent"}
                </strong>
                <span>{feedback.message}</span>
              </div>
            )}
          </form>
        </section>
      </section>
    </main>
  );
}

export default Contact;


// import { useState } from "react";

// function Contact() {
//   const [formData, setFormData] = useState({
//     name: "",
//     phone: "",
//     email: "",
//     subject: "",
//     message: "",
//   });

//   const [submitted, setSubmitted] = useState(false);

//   const handleChange = (event) => {
//     const { name, value } = event.target;

//     setFormData((currentData) => ({
//       ...currentData,
//       [name]: value,
//     }));

//     setSubmitted(false);
//   };

//   const handleSubmit = (event) => {
//     event.preventDefault();

//     const message = {
//       id: `MSG-${Date.now()}`,
//       ...formData,
//       createdAt: new Date().toISOString(),
//       status: "New",
//     };

//     const savedMessages = localStorage.getItem("absCutMessages");

//     const messages = savedMessages
//       ? JSON.parse(savedMessages)
//       : [];

//     messages.push(message);

//     localStorage.setItem(
//       "absCutMessages",
//       JSON.stringify(messages)
//     );

//     setSubmitted(true);

//     setFormData({
//       name: "",
//       phone: "",
//       email: "",
//       subject: "",
//       message: "",
//     });
//   };

//   return (
//     <main className="contact-page">

//       <section className="contact-header">
//         <p className="contact-label">ABS CUT</p>

//         <h1>Contact Us</h1>

//         <span>
//           Have a question about our fashion, custom tailoring,
//           embroidery or monogramming services? We are here to help.
//         </span>
//       </section>

//       <section className="contact-content">

//         <div className="contact-information">

//           <div className="contact-info-card">
//             <p>GET IN TOUCH</p>

//             <h2>Let's Talk About Your Next Outfit</h2>

//             <span>
//               Whether you need a ready-to-wear outfit, custom
//               tailoring, embroidery, monogramming or fashion
//               materials, contact ABS CUT and tell us what you need.
//             </span>
//           </div>

//           <div className="contact-detail">
//             <span>PHONE</span>
//             <strong>08140806540</strong>
//             <strong>09070655906</strong>
//           </div>

//           <div className="contact-detail">
//             <span>WHATSAPP</span>
//             <strong>08140806540</strong>
//           </div>

//           <div className="contact-detail">
//             <span>ADDRESS</span>
//             <strong>
//               Plot 1 Block A Barrister Abdul Fatai Abolaji Str,
//               Pegamut Estate, Ikeshi/Ota, Ogun State.
//             </strong>
//           </div>

//           <div className="contact-services">
//             <span>OUR SERVICES</span>

//             <div>
//               <strong>Native Wear</strong>
//               <strong>Custom Tailoring</strong>
//               <strong>Embroidery</strong>
//               <strong>Monogramming</strong>
//               <strong>Fashion Materials</strong>
//             </div>
//           </div>

//         </div>

//         <div className="contact-form-card">

//           <div className="contact-form-header">
//             <p>CONTACT FORM</p>
//             <h2>Send Us a Message</h2>
//           </div>

//           <form onSubmit={handleSubmit}>

//             <div className="contact-form-row">

//               <div className="contact-form-group">
//                 <label htmlFor="contact-name">
//                   Full Name
//                 </label>

//                 <input
//                   id="contact-name"
//                   name="name"
//                   type="text"
//                   value={formData.name}
//                   onChange={handleChange}
//                   placeholder="Your full name"
//                   required
//                 />
//               </div>

//               <div className="contact-form-group">
//                 <label htmlFor="contact-phone">
//                   Phone Number
//                 </label>

//                 <input
//                   id="contact-phone"
//                   name="phone"
//                   type="tel"
//                   value={formData.phone}
//                   onChange={handleChange}
//                   placeholder="08012345678"
//                   required
//                 />
//               </div>

//             </div>

//             <div className="contact-form-group">
//               <label htmlFor="contact-email">
//                 Email Address
//               </label>

//               <input
//                 id="contact-email"
//                 name="email"
//                 type="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 placeholder="you@example.com"
//               />
//             </div>

//             <div className="contact-form-group">
//               <label htmlFor="contact-subject">
//                 Subject
//               </label>

//               <select
//                 id="contact-subject"
//                 name="subject"
//                 value={formData.subject}
//                 onChange={handleChange}
//                 required
//               >
//                 <option value="">
//                   Select a subject
//                 </option>

//                 <option value="Ready-to-Wear">
//                   Ready-to-Wear
//                 </option>

//                 <option value="Custom Tailoring">
//                   Custom Tailoring
//                 </option>

//                 <option value="Embroidery">
//                   Embroidery
//                 </option>

//                 <option value="Monogramming">
//                   Monogramming
//                 </option>

//                 <option value="Fashion Materials">
//                   Fashion Materials
//                 </option>

//                 <option value="Existing Order">
//                   Existing Order
//                 </option>

//                 <option value="Other">
//                   Other
//                 </option>
//               </select>
//             </div>

//             <div className="contact-form-group">
//               <label htmlFor="contact-message">
//                 Message
//               </label>

//               <textarea
//                 id="contact-message"
//                 name="message"
//                 value={formData.message}
//                 onChange={handleChange}
//                 placeholder="Tell us how we can help..."
//                 rows="6"
//                 required
//               ></textarea>
//             </div>

//             <button
//               type="submit"
//               className="contact-submit-button"
//             >
//               SEND MESSAGE
//             </button>

//             {submitted && (
//               <div className="contact-success-message">
//                 <strong>Message Sent Successfully</strong>
//                 <span>
//                   Thank you for contacting ABS CUT. We will
//                   review your message and get back to you.
//                 </span>
//               </div>
//             )}

//           </form>

//         </div>

//       </section>

//     </main>
//   );
// }

// export default Contact;