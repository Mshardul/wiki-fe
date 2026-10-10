import { Modal } from "@/components/common/Modal";
import type { RevisionCard } from "@/lib/visualizer/core/types";

interface RevisionPopupProps {
  card: RevisionCard;
  glossary: Record<string, string>;
  onClose: () => void;
  onOpen: () => void;
}

export function RevisionPopup({ card, glossary, onClose, onOpen }: RevisionPopupProps) {
  const definition = (card.glossaryTerm ? glossary[card.glossaryTerm] : undefined) ?? card.summary;
  return (
    <Modal
      open
      onClose={onClose}
      label={`About ${card.name}`}
      className="viz-popup"
      backdropClassName="viz-popup-backdrop"
    >
      <h2 className="viz-popup__title">{card.name}</h2>
      <h3 className="viz-popup__label">Definition</h3>
      <p className="viz-popup__text">{definition}</p>
      <h3 className="viz-popup__label">How it differs</h3>
      <p className="viz-popup__text">{card.differs}</p>
      <div className="viz-popup__actions">
        <button type="button" className="viz-btn" onClick={onClose}>
          Close
        </button>
        <button type="button" className="viz-btn" onClick={onOpen}>
          Open in Single <span aria-hidden="true">→</span>
        </button>
      </div>
    </Modal>
  );
}
