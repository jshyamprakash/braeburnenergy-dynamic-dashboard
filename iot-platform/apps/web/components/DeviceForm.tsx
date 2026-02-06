'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useCreateDevice, useUpdateDevice } from '@/lib/hooks/useDevices';
import type { Device } from '@/lib/types';

interface DeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  device?: Device | null; // If provided, it's edit mode
  onSuccess?: () => void;
}

export function DeviceForm({ isOpen, onClose, device, onSuccess }: DeviceFormProps) {
  const isEditMode = !!device;

  // Form state
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attributes, setAttributes] = useState('{}');
  const [attributesError, setAttributesError] = useState('');

  // Mutations
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice(device?.deviceId || '');

  // Initialize form with device data in edit mode
  useEffect(() => {
    if (device) {
      setName(device.name);
      setTags(device.tags || []);
      setAttributes(JSON.stringify(device.attributes || {}, null, 2));
    } else {
      // Reset form for create mode
      setName('');
      setTags([]);
      setTagInput('');
      setAttributes('{}');
      setAttributesError('');
    }
  }, [device, isOpen]);

  // Validate JSON
  const validateJSON = (value: string): boolean => {
    try {
      JSON.parse(value);
      setAttributesError('');
      return true;
    } catch (error) {
      setAttributesError('Invalid JSON format');
      return false;
    }
  };

  // Add tag
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle tag input key press
  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    if (!name.trim()) {
      alert('Please enter a device name');
      return;
    }

    // Validate JSON
    if (!validateJSON(attributes)) {
      return;
    }

    try {
      const attributesObj = JSON.parse(attributes);

      const deviceData = {
        name: name.trim(),
        tags,
        attributes: Object.keys(attributesObj).length > 0 ? attributesObj : undefined,
      };

      if (isEditMode) {
        await updateDevice.mutateAsync(deviceData);
      } else {
        await createDevice.mutateAsync(deviceData);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving device:', error);
      alert('Failed to save device. Please try again.');
    }
  };

  const isLoading = createDevice.isPending || updateDevice.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Device' : 'Create New Device'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Temperature Sensor - Zone A"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagKeyPress}
              placeholder="Enter tag and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Add
            </button>
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attributes (JSON) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attributes (JSON)
          </label>
          <textarea
            value={attributes}
            onChange={(e) => {
              setAttributes(e.target.value);
              validateJSON(e.target.value);
            }}
            rows={6}
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500 ${
              attributesError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder='{"location": "Lab", "type": "sensor"}'
          />
          {attributesError && (
            <p className="mt-1 text-sm text-red-600">{attributesError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter custom attributes as JSON. Leave as {'{}'} for no attributes.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update Device' : 'Create Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
