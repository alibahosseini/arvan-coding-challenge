package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

type Response struct {
	Message string `json:"message"`
}

type ValidateCodeRequest struct {
	Code string `json:"code"`
}

type ValidateCodeResponse struct {
	Valid   bool   `json:"valid"`
	Message string `json:"message"`
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, Response{
		Message: "API is running",
	})
}

func validateCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, ValidateCodeResponse{
			Valid:   false,
			Message: "Method not allowed",
		})
		return
	}

	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		writeJSON(w, http.StatusBadRequest, ValidateCodeResponse{
			Valid:   false,
			Message: "Content-Type must be application/json",
		})
		return
	}

	var req ValidateCodeRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ValidateCodeResponse{
			Valid:   false,
			Message: "Invalid JSON body",
		})
		return
	}

	if strings.TrimSpace(req.Code) == "" {
		writeJSON(w, http.StatusBadRequest, ValidateCodeResponse{
			Valid:   false,
			Message: "Code is required",
		})
		return
	}

	writeJSON(w, http.StatusOK, ValidateCodeResponse{
		Valid:   true,
		Message: "Code is valid",
	})
}

type RunCodeRequest struct {
	Code string `json:"code"`
}

type RunCodeResponse struct {
	Status  string `json:"status"`
	Output  string `json:"output,omitempty"`
	Message string `json:"message,omitempty"`
}

func runCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, RunCodeResponse{Status: "error", Message: "Method not allowed"})
		return
	}

	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		writeJSON(w, http.StatusBadRequest, RunCodeResponse{Status: "error", Message: "Content-Type must be application/json"})
		return
	}

	var req RunCodeRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, RunCodeResponse{Status: "error", Message: "Invalid JSON body"})
		return
	}

	if strings.TrimSpace(req.Code) == "" {
		writeJSON(w, http.StatusBadRequest, RunCodeResponse{Status: "error", Message: "Code is required"})
		return
	}

	// Simulate network/server processing latency (~2-3s).
	time.Sleep(2000*time.Millisecond + time.Duration(rand.Intn(1000))*time.Millisecond)

	// ~80% success / 20% server error, so the frontend can demonstrate both paths.
	if rand.Float64() < 0.8 {
		writeJSON(w, http.StatusOK, RunCodeResponse{Status: "success", Output: "Hello World"})
	} else {
		writeJSON(w, http.StatusInternalServerError, RunCodeResponse{Status: "error", Message: "Something went wrong"})
	}
}

func main() {
	http.HandleFunc("/health", withCORS(healthHandler))
	http.HandleFunc("/api/validate-code", withCORS(validateCodeHandler))
	http.HandleFunc("/api/run", withCORS(runCodeHandler))

	log.Println("Server running on :8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}
