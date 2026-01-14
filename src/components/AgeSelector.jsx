import './AgeSelector.css'

function AgeSelector({ ageLevel, setAgeLevel }) {
  const levels = [
    { age: 5, emoji: '👶', label: 'Like I\'m 5', description: 'Super simple!' },
    { age: 10, emoji: '🧒', label: 'Like I\'m 10', description: 'A bit more detail' },
    { age: 15, emoji: '🧑', label: 'Like I\'m 15', description: 'Teen-friendly' },
    { age: 20, emoji: '🎓', label: 'Normal', description: 'Full explanation' }
  ]

  return (
    <div className="age-selector">
      <div className="age-selector-header">
        <span className="header-emoji">🎚️</span>
        <span>Explanation Level</span>
      </div>
      <div className="age-buttons">
        {levels.map((level) => (
          <button
            key={level.age}
            className={`age-btn ${ageLevel === level.age ? 'active' : ''}`}
            onClick={() => setAgeLevel(level.age)}
          >
            <span className="age-emoji">{level.emoji}</span>
            <span className="age-label">{level.label}</span>
            <span className="age-description">{level.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default AgeSelector
