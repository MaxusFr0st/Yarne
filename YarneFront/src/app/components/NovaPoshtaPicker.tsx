import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

// Ported as closely as possible from Nova Poshta's own buttonHtml_v2.html reference
// integration — same markup, same CSS, same widget URL/postMessage protocol. Deliberately
// does NOT use the app's design system: this is meant to look like Nova Poshta's own
// component, not a Yarne-themed one.

const WIDGET_ORIGIN = "https://widget.novapost.com";
const WIDGET_URL = "https://widget.novapost.com/division/index.html";

export interface NovaPoshtaSelection {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
}

interface NovaPoshtaWidgetMessage {
  externalId?: string;
  shortName?: string;
  name?: string;
  refCity?: {
    externalId?: string;
    shortName?: string;
    name?: string;
  };
}

export function NovaPoshtaPicker({
  value,
  onSelect,
  tone = "light",
}: {
  value: NovaPoshtaSelection | null;
  onSelect: (selection: NovaPoshtaSelection) => void;
  /** `dark` renders a minimal trigger for dark cards (checkout summary); default matches Nova Poshta's own widget look. */
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useBodyScrollLock(open);

  const handleMessage = useCallback(
    (event: MessageEvent<NovaPoshtaWidgetMessage>) => {
      if (event.origin !== WIDGET_ORIGIN) return;
      const data = event.data;
      const warehouseRef = data?.externalId;
      const cityRef = data?.refCity?.externalId;
      if (!warehouseRef || !cityRef) return;

      onSelect({
        warehouseRef,
        warehouseName: data.shortName || data.name || "",
        cityRef,
        cityName: data.refCity?.shortName || data.refCity?.name || "",
      });
      setOpen(false);
    },
    [onSelect],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, handleMessage]);

  function sendConfig(latitude: number | string, longitude: number | string) {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.onload = () => {
      iframe.contentWindow?.postMessage(
        { placeName: value?.cityName || "", latitude, longitude, domain: window.location.hostname },
        "*",
      );
    };
  }

  function openFrame() {
    setOpen(true);
    sendConfig("", "");
    navigator.geolocation?.getCurrentPosition(
      (position) => sendConfig(position.coords.latitude, position.coords.longitude),
      () => {},
    );
  }

  function closeFrame() {
    setOpen(false);
  }

  return (
    <>
      <style>{`
        .np-widget-button {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          padding: 11px 40px 11px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          font-family: Inter, sans-serif;
          background-color: #fff;
          cursor: pointer;
          max-width: 344px;
          width: 100%;
          position: relative;
          box-sizing: border-box;
        }
        .np-widget-button .np-logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .np-widget-button .np-angle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          right: 20px;
          height: 16px;
        }
        .np-widget-button .np-wrapper {
          display: flex;
          flex-direction: column;
          font-family: Inter, sans-serif;
          font-weight: 500;
          min-width: 0;
        }
        .np-widget-button .np-text {
          font-size: 16px;
          line-height: 21px;
          color: #0F172A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .np-widget-button .np-text-description {
          font-size: 14px;
          font-weight: 400;
          line-height: 18px;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .np-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .np-modal {
          position: relative;
          width: 80%;
          height: 80%;
          background-color: white;
          overflow: hidden;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .np-modal-header {
          position: relative;
          height: 80px;
          padding: 0 20px;
          border-bottom: 1px solid #E2E8F0;
          line-height: 80px;
        }
        .np-modal-header h2 {
          margin: 0;
          font-family: Inter, sans-serif;
          font-size: 20px;
          line-height: 80px;
          font-weight: 600;
          color: #0F172A;
        }
        .np-modal-close {
          cursor: pointer;
          font-size: 32px;
          color: #333;
          position: absolute;
          right: 0;
          top: 0;
          width: 40px;
          height: 100%;
          background: none;
          border: none;
          line-height: 1;
          padding: 0;
        }
        .np-modal-iframe {
          width: 100%;
          height: calc(100% - 81px);
          border: none;
          display: block;
        }
        @media screen and (max-width: 767px) {
          .np-modal {
            width: 100vw;
            height: 100vh;
          }
          .np-modal-header {
            display: none;
          }
          .np-modal-iframe {
            height: 100%;
          }
        }
      `}</style>

      {tone === "dark" ? (
        <button
          type="button"
          onClick={openFrame}
          className="w-full flex items-center justify-between gap-3 rounded-[14px] px-4 py-3.5 cursor-pointer text-left"
          style={{ backgroundColor: "rgba(245,242,237,0.14)", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
        >
          <span className="truncate">
            {value ? `${value.warehouseName}, ${value.cityName}` : "Обрати відділення"}
          </span>
          <ChevronRight size={15} strokeWidth={1.5} className="shrink-0" />
        </button>
      ) : (
        <div
          className="np-widget-button"
          onClick={openFrame}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openFrame();
          }}
        >
          <div className="np-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11.9401 16.4237H16.0596V21.271H19.2101L15.39 25.0911C14.6227 25.8585 13.3791 25.8585 12.6118 25.0911L8.79166 21.271H11.9401V16.4237ZM21.2688 19.2102V8.78972L25.091 12.6098C25.8583 13.3772 25.8583 14.6207 25.091 15.3881L21.2688 19.2102ZM16.0596 6.73099V11.5763H11.9401V6.73099H8.78958L12.6097 2.90882C13.377 2.14148 14.6206 2.14148 15.3879 2.90882L19.2101 6.73099H16.0596ZM2.90868 12.6098L6.72877 8.78972V19.2102L2.90868 15.3901C2.14133 14.6228 2.14133 13.3772 2.90868 12.6098Z"
                fill="#DA291C"
              />
            </svg>
          </div>
          <div className="np-wrapper" style={{ flex: 1, minWidth: 0 }}>
            <span className="np-text">{value ? value.warehouseName : ""}</span>
            <span className="np-text-description">{value ? value.cityName : "Обрати відділення або поштомат"}</span>
          </div>
          <div className="np-angle">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.49399 1.44891L10.0835 5.68541L10.1057 5.70593C10.4185 5.99458 10.6869 6.24237 10.8896 6.4638C11.1026 6.69642 11.293 6.95179 11.4023 7.27063C11.5643 7.74341 11.5643 8.25668 11.4023 8.72946C11.293 9.0483 11.1026 9.30367 10.8896 9.53629C10.6869 9.75771 10.4184 10.0055 10.1057 10.2942L10.0835 10.3147L5.49398 14.5511L4.47657 13.4489L9.06607 9.21246C9.40722 8.89756 9.62836 8.69258 9.78328 8.52338C9.93272 8.36015 9.96962 8.28306 9.98329 8.24318C10.0373 8.08559 10.0373 7.9145 9.98329 7.7569C9.96963 7.71702 9.93272 7.63993 9.78328 7.4767C9.62837 7.3075 9.40722 7.10252 9.06608 6.78761L4.47656 2.55112L5.49399 1.44891Z"
                fill="#475569"
              />
            </svg>
          </div>
        </div>
      )}

      {open && (
        <div className="np-modal-overlay" onClick={closeFrame}>
          <div className="np-modal" onClick={(e) => e.stopPropagation()}>
            <header className="np-modal-header">
              <h2>Вибрати відділення</h2>
              <button type="button" className="np-modal-close" onClick={closeFrame} aria-label="Закрити">
                &times;
              </button>
            </header>
            <iframe ref={iframeRef} className="np-modal-iframe" title="Nova Poshta" src={WIDGET_URL} allow="geolocation" />
          </div>
        </div>
      )}
    </>
  );
}
