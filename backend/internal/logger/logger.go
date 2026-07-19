package logger

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// DailyLogWriter is a thread-safe writer that automatically rotates the log file
// based on the calendar day, outputting to both the file and stdout.
type DailyLogWriter struct {
	mu       sync.Mutex
	logDir   string
	currDate string
	file     *os.File
}

// NewDailyLogWriter creates the log directory if it doesn't exist and initializes the logger.
func NewDailyLogWriter(dir string) (*DailyLogWriter, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}
	w := &DailyLogWriter{logDir: dir}
	if err := w.rotate(); err != nil {
		return nil, err
	}
	return w, nil
}

// rotate checks if the date has changed and opens a new log file if necessary.
func (w *DailyLogWriter) rotate() error {
	dateStr := time.Now().Format("20060102")
	if dateStr == w.currDate && w.file != nil {
		return nil
	}

	if w.file != nil {
		w.file.Close()
	}

	fileName := fmt.Sprintf("key-vault-%s.log", dateStr)
	filePath := filepath.Join(w.logDir, fileName)

	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file %s: %w", filePath, err)
	}

	w.file = f
	w.currDate = dateStr
	return nil
}

// Write writes the log payload to both stdout and the active daily file.
func (w *DailyLogWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if err := w.rotate(); err != nil {
		os.Stdout.Write([]byte(fmt.Sprintf("[Logger Rotation Error]: %v\n", err)))
	}

	// Output to both file and standard console
	multiWriter := io.MultiWriter(w.file, os.Stdout)
	return multiWriter.Write(p)
}
