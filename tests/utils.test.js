// tests/utils.test.js

// Import our module
const Utils = require('../js/utils');

describe('Utils', () => {
    describe('debounce', () => {
        jest.useFakeTimers();

        it('should debounce function calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 1000);

            // Call the debounced function multiple times
            debouncedFn('first call');
            debouncedFn('second call');
            debouncedFn('third call');

            // Fast-forward time
            jest.runAllTimers();

            // Expect the function to have been called only once
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(mockFn).toHaveBeenCalledWith('third call');
        });

        it('should call function after specified wait time', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 500);

            debouncedFn('test');

            // Fast-forward time by 499ms
            jest.advanceTimersByTime(499);
            expect(mockFn).not.toHaveBeenCalled();

            // Fast-forward the remaining 1ms
            jest.advanceTimersByTime(1);
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(mockFn).toHaveBeenCalledWith('test');
        });
    });
});