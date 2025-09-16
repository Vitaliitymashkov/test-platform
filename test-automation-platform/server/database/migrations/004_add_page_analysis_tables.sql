-- Create page_analyses table to store analyzed page data
CREATE TABLE IF NOT EXISTS page_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(255),
    page_type VARCHAR(50),
    analysis_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create page_elements table to store identified interactive elements
CREATE TABLE IF NOT EXISTS page_elements (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES page_analyses(id) ON DELETE CASCADE,
    element_type VARCHAR(50),
    selector TEXT,
    text TEXT,
    attributes JSONB,
    is_interactive BOOLEAN DEFAULT false,
    suggested_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create selector_suggestions table to cache generated selector recommendations
CREATE TABLE IF NOT EXISTS selector_suggestions (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES page_analyses(id) ON DELETE CASCADE,
    element_hash VARCHAR(255),
    primary_selector TEXT,
    alternative_selectors JSONB,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_page_analyses_user_id ON page_analyses(user_id);
CREATE INDEX idx_page_analyses_url ON page_analyses(url);
CREATE INDEX idx_page_analyses_created_at ON page_analyses(created_at DESC);
CREATE INDEX idx_page_elements_analysis_id ON page_elements(analysis_id);
CREATE INDEX idx_page_elements_is_interactive ON page_elements(is_interactive);
CREATE INDEX idx_selector_suggestions_analysis_id ON selector_suggestions(analysis_id);
CREATE INDEX idx_selector_suggestions_element_hash ON selector_suggestions(element_hash);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_analyses_updated_at BEFORE UPDATE
    ON page_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();