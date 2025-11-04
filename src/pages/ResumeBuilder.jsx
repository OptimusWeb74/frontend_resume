import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileText,
  FolderIcon,
  GraduationCap,
  Share2Icon,
  Sparkle,
  User,
} from "lucide-react";
import PersonalInfoForm from "../components/PersonalInfoForm";
import ResumePreview from "../components/ResumePreview";
import TemplateSelector from "../components/TemplateSelector";
import ColorPicker from "../components/ColorPicker";
import ProfessionalSummaryForm from "../components/ProfessionalSummaryForm";
import ExperienceForm from "../components/ExperienceForm";
import EducationForm from "../components/EducationForm";
import ProjectForm from "../components/ProjectForm";
import SkillsForm from "../components/SkillsForm";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function ResumeBuilder() {
  const { resumeId } = useParams();
  const { token } = useSelector((state) => state.auth);
  const resumePreviewRef = useRef(null);

  const [resumeData, setResumeData] = useState({
    _id: "",
    title: "",
    personal_info: {},
    professional_summary: "",
    experience: [],
    education: [],
    project: [],
    skills: [],
    template: "classic",
    accent_color: "#3B82F6",
    public: false,
  });

  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const sections = [
    { id: "personal", name: "Personal Info", icon: User },
    { id: "summary", name: "Summary", icon: FileText },
    { id: "experience", name: "Experience", icon: Briefcase },
    { id: "education", name: "Education", icon: GraduationCap },
    { id: "projects", name: "Projects", icon: FolderIcon },
    { id: "skills", name: "Skills", icon: Sparkle },
  ];

  const activeSection = sections[activeSectionIndex];

  // Load existing resume on mount
  const loadExistingResume = async () => {
    try {
      const { data } = await api.get("/api/resumes/get/" + resumeId, {
        headers: { Authorization: token },
      });
      if (data.resume) {
        setResumeData(data.resume);
        document.title = data.resume.title;
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    loadExistingResume();
  }, []);

  // Manual save (with error handling for image issues)
  const saveResume = async () => {
    try {
      setSaving(true);
      let updatedResumeData = structuredClone(resumeData);
      if (typeof resumeData.personal_info.image === "object") {
        delete updatedResumeData.personal_info.image;
      }

      const formData = new FormData();
      formData.append("resumeId", resumeId);
      formData.append("resumeData", JSON.stringify(updatedResumeData));
      removeBackground && formData.append("removeBackground", "yes");
      typeof resumeData.personal_info.image === "object" &&
        formData.append("image", resumeData.personal_info.image);

      const { data } = await api.put("/api/resumes/update", formData, {
        headers: { Authorization: token },
      });

      setResumeData(data.resume);
      setLastSaved(new Date().toLocaleTimeString());
      toast.success(data.message);
    } catch (error) {
      console.error("Error saving resume:", error);

      // Detect backend image processing error and give a user-friendly message
      const backendMessage = error?.response?.data?.message || "";
      if (
        typeof backendMessage === "string" &&
        backendMessage.toLowerCase().includes("process this photo")
      ) {
        toast.error(
          "Your photo couldn't be processed. Please upload a different image (JPG, PNG or WEBP, <5MB)."
        );
      } else {
        toast.error(backendMessage || "Failed to save resume.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ✅ Auto-save logic (with same error handling)
  useEffect(() => {
    if (!resumeData._id) return; // Wait until resume is loaded

    const debounceTimer = setTimeout(async () => {
      try {
        setSaving(true);
        let updatedResumeData = structuredClone(resumeData);
        if (typeof resumeData.personal_info.image === "object") {
          delete updatedResumeData.personal_info.image;
        }

        const formData = new FormData();
        formData.append("resumeId", resumeId);
        formData.append("resumeData", JSON.stringify(updatedResumeData));
        removeBackground && formData.append("removeBackground", "yes");
        typeof resumeData.personal_info.image === "object" &&
          formData.append("image", resumeData.personal_info.image);

        await api.put("/api/resumes/update", formData, {
          headers: { Authorization: token },
        });

        setLastSaved(new Date().toLocaleTimeString());
        console.log("Auto-saved successfully!");
      } catch (error) {
        console.error("Auto-save failed:", error);

        const backendMessage = error?.response?.data?.message || "";
        if (
          typeof backendMessage === "string" &&
          backendMessage.toLowerCase().includes("process this photo")
        ) {
          toast.error(
            "Your photo couldn't be processed. Please upload a different image (JPG, PNG or WEBP, <5MB)."
          );
        } else {
          // Optionally show a subtle toast for other auto-save failures
          // toast.error(backendMessage || "Auto-save failed.");
          console.warn("Auto-save error (non-blocking):", backendMessage);
        }
      } finally {
        setSaving(false);
      }
    }, 2500); // 2.5 seconds delay after edits stop

    return () => clearTimeout(debounceTimer);
  }, [resumeData]);

  const changeResumeVisibility = async () => {
    try {
      const formData = new FormData();
      formData.append("resumeId", resumeId);
      formData.append(
        "resumeData",
        JSON.stringify({ public: !resumeData.public })
      );
      const { data } = await api.put("/api/resumes/update", formData, {
        headers: { Authorization: token },
      });
      setResumeData({ ...resumeData, public: !resumeData.public });
      toast.success(data.message);
    } catch (error) {
      console.error("Error saving resume:", error);

      const backendMessage = error?.response?.data?.message || "";
      if (
        typeof backendMessage === "string" &&
        backendMessage.toLowerCase().includes("process this photo")
      ) {
        toast.error(
          "Your photo couldn't be processed. Please upload a different image (JPG, PNG or WEBP, <5MB)."
        );
      } else {
        toast.error(backendMessage || "Failed to change visibility.");
      }
    }
  };

  const handleShare = () => {
    const frontendUrl = window.location.href.split("/app")[0];
    const resumeUrl = frontendUrl + "/view/" + resumeId;

    if (navigator.share) {
      navigator.share({ url: resumeUrl, text: "My Resume" });
    } else {
      alert("Share not supported on this browser.");
    }
  };

  const downloadResume = () => {
    window.print();
  };

  // PDF generation functions (kept as before)
  const downloadResumeSimple = async () => {
    setDownloading(true);
    const downloadToast = toast.loading("Preparing download...");

    try {
      const element = resumePreviewRef.current;
      if (!element) {
        throw new Error("Resume preview not found");
      }

      // Simple approach with fixed dimensions
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${resumeData.title || "resume"}.pdf`);

      toast.success("Resume downloaded successfully!", { id: downloadToast });
    } catch (error) {
      console.error("Error in simple PDF generation:", error);
      toast.error("Download failed. Please try again.", { id: downloadToast });
    } finally {
      setDownloading(false);
    }
  };

  // Advanced paginated PDF (kept if you need it)
  const downloadResumePaginated = async () => {
    setDownloading(true);
    const downloadToast = toast.loading("Generating PDF...");

    try {
      const element = resumePreviewRef.current;
      if (!element) {
        throw new Error("Resume preview not found");
      }

      // Ensure the element is visible and properly rendered
      element.style.display = "block";

      // Wait for images to load
      const images = element.getElementsByTagName("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      await Promise.all(imagePromises);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector(".resume-preview-container");
          if (clonedElement) {
            clonedElement.style.width = "100%";
            clonedElement.style.height = "auto";
            clonedElement.style.display = "block";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let heightLeft = imgHeight;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${resumeData.title || "resume"}.pdf`);

      toast.success("Resume downloaded successfully!", { id: downloadToast });
    } catch (error) {
      console.error("Error generating PDF:", error);

      toast.error("PDF generation failed. Using print method instead.", {
        id: downloadToast,
      });
      setTimeout(() => {
        window.print();
      }, 1000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          to={"/app"}
          className="inline-flex gap-2 items-center text-slate-500 hover:text-slate-700 transition-all"
        >
          <ArrowLeftIcon className="size-14" /> Back to Dashboard
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Panel */}
          <div className="relative lg:col-span-5 rounded-lg overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 pt-1">
              {/* Progress Bar */}
              <hr className="absolute top-0 left-0 right-0 border-2 border-gray-200" />
              <hr
                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-green-500 to-green-600 border-none transition-all duration-2000"
                style={{
                  width: `${(activeSectionIndex * 100) / (sections.length - 1)}%`,
                }}
              />

              {/* Navigation */}
              <div className="flex justify-between items-center mb-6 border-b border-gray-300 py-1">
                <div className="flex items-center gap-2">
                  <TemplateSelector
                    selectedTemplate={resumeData.template}
                    onChange={(template) =>
                      setResumeData((prev) => ({ ...prev, template }))
                    }
                  />
                  <ColorPicker
                    selectedColor={resumeData.accent_color}
                    onChange={(color) =>
                      setResumeData((prev) => ({ ...prev, accent_color: color }))
                    }
                  />
                </div>
                {activeSectionIndex !== 0 && (
                  <button
                    onClick={() => setActiveSectionIndex((prev) => Math.max(prev - 1, 0))}
                    className="flex items-center gap-1 p-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </button>
                )}
                <button
                  onClick={() => setActiveSectionIndex((prev) => Math.min(prev + 1, sections.length - 1))}
                  className={`flex items-center gap-1 p-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all ${activeSectionIndex === sections.length - 1 && "opacity-50"}`}
                  disabled={activeSectionIndex === sections.length - 1}
                >
                  Next <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6">
                {activeSection.id === "personal" && (
                  <PersonalInfoForm
                    data={resumeData.personal_info}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, personal_info: data }))}
                    removeBackground={removeBackground}
                    setRemoveBackground={setRemoveBackground}
                  />
                )}
                {activeSection.id === "summary" && (
                  <ProfessionalSummaryForm
                    data={resumeData.professional_summary}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, professional_summary: data }))}
                    setResumeData={setResumeData}
                  />
                )}
                {activeSection.id === "experience" && (
                  <ExperienceForm
                    data={resumeData.experience}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, experience: data }))}
                  />
                )}
                {activeSection.id === "education" && (
                  <EducationForm
                    data={resumeData.education}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, education: data }))}
                  />
                )}
                {activeSection.id === "projects" && (
                  <ProjectForm
                    data={resumeData.project}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, project: data }))}
                  />
                )}
                {activeSection.id === "skills" && (
                  <SkillsForm
                    data={resumeData.skills}
                    onChange={(data) => setResumeData((prev) => ({ ...prev, skills: data }))}
                  />
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={() => toast.promise(saveResume(), { loading: "Saving..." })}
                className="bg-gradient-to-br from-green-100 to-green-200 ring-green-300 text-green-600 ring hover:ring-green-400 transition-all rounded-md px-6 py-2 mt-6 text-sm"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {lastSaved && <p className="text-xs text-gray-400 mt-2">Auto-saved at {lastSaved}</p>}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-7 max-lg:mt-6">
            <div className="relative w-full">
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-end gap-2">
                {resumeData.public && (
                  <button
                    onClick={handleShare}
                    className="flex items-center p-2 px-4 gap-2 text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 rounded-lg ring-blue-300 hover:ring transition-colors"
                  >
                    <Share2Icon className="size-4" />
                    Share
                  </button>
                )}
                <button
                  onClick={changeResumeVisibility}
                  className="flex items-center p-2 px-4 gap-2 text-xs bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 ring-purple-300 rounded-lg hover:ring transition-colors"
                >
                  {resumeData.public ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
                  {resumeData.public ? "Public" : "Private"}
                </button>
                <button
                  onClick={downloadResumeSimple}
                  disabled={downloading}
                  className="flex items-center gap-2 px-6 py-2 text-xs bg-gradient-to-br from-green-100 to-green-200 text-green-600 rounded-lg ring-green-300 hover:ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DownloadIcon className="size-4" />
                  {downloading ? "Generating..." : "Download"}
                </button>
              </div>
            </div>
            {/* Wrap ResumePreview with ref for PDF generation */}
            <div ref={resumePreviewRef} className="resume-preview-container">
              <ResumePreview data={resumeData} template={resumeData.template} accentColor={resumeData.accent_color} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder;
